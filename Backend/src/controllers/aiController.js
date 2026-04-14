const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const Emergency = require('../models/Emergency');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');

const chatModel = new ChatGoogleGenerativeAI({
  model: "gemma-3-27b-it", 
  maxOutputTokens: 600, 
  temperature: 0.2, 
  apiKey: process.env.GOOGLE_API_KEY,
  streaming: true 
});

exports.handlePatientChat = async (req, res) => {
  try {
    const { patientId, message, history, location, language } = req.body; 
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const selectedLanguage = language || 'English';
    const io = req.app.get('socketio');

    // ==========================================
    // 1. UPDATED PROMPT: Banning 911 & Forcing Physical Steps
    // ==========================================
    const systemPrompt = `
      You are MedAssist, an emergency medical triage AI. The patient is speaking in: ${selectedLanguage}.

      CRITICAL DISPATCH RULES:
      If symptoms match exactly ONE of these severe conditions: ['Heart Attack', 'Stroke', 'Cardiac Arrest', 'Severe Asthma Attack', 'Severe External Bleeding', 'Brain Hemorrhage', 'Seizure', 'Snake Bite'].
      1. Set "severity" to "CRITICAL".
      2. Set "disease" to the exact English term from the list above.
      3. Your "immediate_actions" array MUST contain EXACTLY 4 physical, actionable first-aid steps (e.g., "Elevate the head", "Loosen clothing").
      STRICT RULE: YOU MUST NEVER tell the patient to call 911, call an ambulance, or contact emergency services. The ambulance is ALREADY dispatched.

      NON-DISPATCH ADVICE RULES:
      If symptoms are NOT severe (e.g., 'Feeling Cold', 'Slight Headache'):
      1. Set "severity" to "NON_CRITICAL" and "disease" to "None".
      2. Your conversational reply MUST provide detailed general medical advice.

      OUTPUT FORMAT:
      1. First, output your empathetic conversational response. You MUST use Markdown (bolding, lists) to make it highly readable.
      2. Immediately after your response, output EXACTLY this delimiter: [[|JSON_DATA|]]
      3. Immediately after the delimiter, output the JSON block. Do not use \`\`\`json markdown blocks.

      FORMAT:
      Your markdown conversational response goes here.
      [[|JSON_DATA|]]
      {
        "severity": "CRITICAL" | "NON_CRITICAL",
        "disease": "Exact English term or 'None'",
        "immediate_actions": ["Physical step 1", "Physical step 2", "Physical step 3", "Physical step 4"]
      }
    `;

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
          if (token && !fullResponse.includes('[[')) {
            io.to(patientId.toString()).emit('stream_token', { token });
          }
        }
      }
    }

    // ==========================================
    // 3. PARSE JSON & THE JAVASCRIPT SCRUBBER 
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

    // --- THE JAVASCRIPT BULLETPROOF SHIELD ---
    let safeActions = aiData.immediate_actions || [];
    
    // 1. Scrub forbidden words from the array
    safeActions = safeActions.map(action => {
      if (/911|emergency|ambulance|doctor/i.test(action)) {
        return "Keep the patient as comfortable and still as possible.";
      }
      return action;
    });

    // 2. Force it to be exactly 4 items (Fixes UI breaking if AI sends 3 or 5)
    if (safeActions.length > 4) safeActions = safeActions.slice(0, 4);
    while (safeActions.length < 4) {
      safeActions.push("Monitor the patient's breathing continuously.");
    }
    
    // Apply the clean array back to the data
    aiData.immediate_actions = safeActions;
    // ----------------------------------------

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

    res.json({
      reply: userReplyText, 
      isEmergencyDispatched,
      isAmbulanceAssigned,
      disease: aiData.disease,
      immediate_actions: aiData.immediate_actions, // This is now scrubbed and perfectly sized!
      hospitalName: assignedHospitalName,
      severity: aiData.severity
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
};