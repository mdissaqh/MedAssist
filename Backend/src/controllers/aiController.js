const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
const Emergency = require('../models/Emergency');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');

// ==========================================
// 1. GEMMA CONFIGURATION & TOKEN OPTIMIZATION
// ==========================================
const chatModel = new ChatGoogleGenerativeAI({
  model: "gemma-3-27b-it", // Using Gemma as requested
  maxOutputTokens: 400, // Protects your 15k TPM limit
  temperature: 0.1, 
  apiKey: process.env.GOOGLE_API_KEY
});

exports.handlePatientChat = async (req, res) => {
  try {
    const { patientId, message, history, location, language } = req.body; 
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const selectedLanguage = language || 'English';

    // ==========================================
    // 2. UPDATED PROMPT: Advice vs Dispatch Rules
    // ==========================================
    const systemPrompt = `
      You are MedAssist, an empathetic medical advice and emergency triage AI.
      The patient is communicating in: ${selectedLanguage}.

      CRITICAL DISPATCH RULES:
      If symptoms match exactly ONE of these severe conditions: ['Heart Attack', 'Stroke', 'Cardiac Arrest', 'Severe Asthma Attack', 'Severe External Bleeding', 'Brain Hemorrhage', 'Seizure', 'Snake Bite'].
      1. Set "severity" to "CRITICAL".
      2. Set "disease" to the exact English term from the list above.
      3. Your "reply" must be short: "I am alerting the nearest hospital. Help is on the way." (Translated to ${selectedLanguage}). Do NOT tell them to call emergency services.

      NON-DISPATCH ADVICE RULES:
      If symptoms are NOT severe or do NOT fall on the critical list (e.g., 'Feeling Cold', 'Slight Headache', 'Stomach ache'):
      1. Set "severity" to "NON_CRITICAL".
      2. Set "disease" to "None".
      3. Your "reply" MUST provide detailed general medical advice in ${selectedLanguage}, including: explanations, comfort steps, when to see a doctor, and over-the-counter medicine suggestions if appropriate.

      OUTPUT ONLY VALID JSON. Do not use markdown blocks like \`\`\`json.
      FORMAT:
      {
        "reply": "Your empathetic response or advice",
        "severity": "CRITICAL" | "NON_CRITICAL",
        "disease": "Exact English term or 'None'",
        "immediate_actions": ["Action 1", "Action 2"]
      }
    `;

    // ==========================================
    // 3. INPUT TOKEN OPTIMIZATION (Crucial for 15k TPM)
    // Keep only the last 4 messages to save tokens.
    // ==========================================
    let trimmedHistory = [];
    if (history && history.length > 0) {
      trimmedHistory = history.slice(-4); 
    }

    const messages = [new SystemMessage(systemPrompt)];
    trimmedHistory.forEach(msg => messages.push(msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)));
    messages.push(new HumanMessage(message));

    // Wait for the AI to finish generating the full response
    const response = await chatModel.invoke(messages);
    
    let aiData;
    try {
      // Safely extract JSON even if Gemma acts weird
      let cleanText = response.content.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      aiData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("AI Parse Error:", response.content);
      aiData = { 
        reply: "Help is on the way. Please stay calm while I connect you to the nearest hospital.", 
        severity: "CRITICAL", 
        disease: "Other", 
        immediate_actions: ["Sit down and rest", "Unlock your door"] 
      };
    }

    let isEmergencyDispatched = false;
    let isAmbulanceAssigned = false;
    let assignedHospitalName = null;
    
    if (aiData.severity === 'CRITICAL') {
      isEmergencyDispatched = true;
      
      const predictedDisease = aiData.disease.trim();
      
      const availableHospital = await Hospital.findOne({
        availableAmbulances: { $gt: 0 },
        specialties: { 
          $elemMatch: { 
            disease: predictedDisease, 
            isAvailable: true 
          } 
        }
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
        const io = req.app.get('socketio');
        // Emit to the specific hospital room
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

    // Send the final result back to the frontend!
    res.json({
      reply: aiData.reply,
      isEmergencyDispatched,
      isAmbulanceAssigned,
      disease: aiData.disease,
      immediate_actions: aiData.immediate_actions || [],
      hospitalName: assignedHospitalName,
      severity: aiData.severity // Send severity so frontend knows if it's NON_CRITICAL
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
};