const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const Emergency = require('../models/Emergency');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');

const chatModel = new ChatGoogleGenerativeAI({
  model: "gemma-3-27b-it", 
  maxOutputTokens: 600, // Increased slightly to allow for markdown + 4 actions
  temperature: 0.2, // Slightly higher for better conversational markdown
  apiKey: process.env.GOOGLE_API_KEY,
  streaming: true // We are bringing streaming back!
});

exports.handlePatientChat = async (req, res) => {
  try {
    const { patientId, message, history, location, language } = req.body; 
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const selectedLanguage = language || 'English';
    const io = req.app.get('socketio');

    // ==========================================
    // 1. UPDATED PROMPT: Markdown + Exactly 4 Actions
    // ==========================================
    const systemPrompt = `
      You are MedAssist, an emergency medical triage AI. The patient is speaking in: ${selectedLanguage}.

      CRITICAL DISPATCH RULES:
      If symptoms match exactly ONE of these severe conditions: ['Heart Attack', 'Stroke', 'Cardiac Arrest', 'Severe Asthma Attack', 'Severe External Bleeding', 'Brain Hemorrhage', 'Seizure', 'Snake Bite'].
      1. Set "severity" to "CRITICAL".
      2. Set "disease" to the exact English term from the list above.
      3. Your "immediate_actions" array MUST contain EXACTLY 4 highly specific, actionable first-aid steps.

      NON-DISPATCH ADVICE RULES:
      If symptoms are NOT severe (e.g., 'Feeling Cold', 'Slight Headache'):
      1. Set "severity" to "NON_CRITICAL" and "disease" to "None".
      2. Your conversational reply MUST provide detailed general medical advice.

      OUTPUT FORMAT:
      1. First, output your empathetic conversational response. You MUST use Markdown (bolding, lists) to make it highly readable. Do not say you are calling 911.
      2. Immediately after your response, output EXACTLY this delimiter: [[|JSON_DATA|]]
      3. Immediately after the delimiter, output the JSON block. Do not use \`\`\`json markdown blocks.

      FORMAT:
      Your markdown conversational response goes here.
      [[|JSON_DATA|]]
      {
        "severity": "CRITICAL" | "NON_CRITICAL",
        "disease": "Exact English term or 'None'",
        "immediate_actions": ["Action 1", "Action 2", "Action 3", "Action 4"]
      }
    `;

    // History trimming (Max 4 messages)
    let trimmedHistory = [];
    if (history && history.length > 0) {
      trimmedHistory = history.slice(-4); 
    }

    const messages = [];
    trimmedHistory.forEach(msg => messages.push(msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)));

    const combinedFinalMessage = `
--- SYSTEM INSTRUCTIONS ---
${systemPrompt}

--- PATIENT MESSAGE ---
${message}
    `;
    messages.push(new HumanMessage(combinedFinalMessage));

    // ==========================================
    // 2. STREAMING LOGIC
    // ==========================================
    const stream = await chatModel.stream(messages);
    let fullResponse = "";
    let userReplyText = "";
    let isDelimiterHit = false;

    for await (const chunk of stream) {
      const token = chunk.content;
      fullResponse += token;

      if (!isDelimiterHit) {
        if (fullResponse.includes('[[|JSON_DATA|]]')) {
          isDelimiterHit = true;
          userReplyText = fullResponse.split('[[|JSON_DATA|]]')[0].trim();
        } else {
          // Stream tokens directly to the patient's frontend!
          if (token && !fullResponse.includes('[[')) {
            io.to(patientId.toString()).emit('stream_token', { token });
          }
        }
      }
    }

    // ==========================================
    // 3. PARSE JSON & DATABASE UPDATE
    // ==========================================
    let aiData;
    try {
      const jsonString = fullResponse.split('[[|JSON_DATA|]]')[1].trim();
      const cleanText = jsonString.replace(/```json/gi, '').replace(/```/gi, '').trim();
      aiData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("AI Parse Error:", fullResponse);
      userReplyText = userReplyText || "Help is on the way. Please stay calm while I connect you.";
      aiData = { severity: "CRITICAL", disease: "Other", immediate_actions: ["Sit down", "Stay calm", "Take deep breaths", "Unlock doors"] };
    }

    let isEmergencyDispatched = false;
    let isAmbulanceAssigned = false;
    let assignedHospitalName = null;
    
    if (aiData.severity === 'CRITICAL') {
      isEmergencyDispatched = true;
      const predictedDisease = aiData.disease.trim();
      
      const availableHospital = await Hospital.findOne({
        availableAmbulances: { $gt: 0 },
        specialties: { $elemMatch: { disease: predictedDisease, isAvailable: true } }
      });

      let hospitalIdToAssign = null;
      if (availableHospital) {
        hospitalIdToAssign = availableHospital._id;
        assignedHospitalName = availableHospital.name;
        isAmbulanceAssigned = true;
        availableHospital.availableAmbulances -= 1;
        await availableHospital.save();
      }

      const newEmergency = await Emergency.create({
        patient: patient._id,
        assignedHospital: hospitalIdToAssign,
        location: location || { lat: 0, lng: 0 },
        symptomsReported: message,
        aiPredictedDisease: predictedDisease,
        severity: 'CRITICAL',
        status: isAmbulanceAssigned ? 'DISPATCHED' : 'SEARCHING_AMBULANCE'
      });

      if (isAmbulanceAssigned) {
        io.to(hospitalIdToAssign.toString()).emit('new_emergency', {
          id: newEmergency._id,
          patientMobile: patient.mobileNumber,
          address: location ? `Lat: ${location.lat}, Lng: ${location.lng}` : "Location pending...",
          symptoms: message,
          predictedDisease: predictedDisease,
          eta: "8 Mins", 
        });
      }
    }

    // Resolve the frontend API await with the finalized data
    res.json({
      reply: userReplyText, // The clean markdown string
      isEmergencyDispatched,
      isAmbulanceAssigned,
      disease: aiData.disease,
      immediate_actions: aiData.immediate_actions || [], // Will now contain 4 points
      hospitalName: assignedHospitalName,
      severity: aiData.severity
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
};