const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
const Emergency = require('../models/Emergency');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital'); // We need this to map the hospital!

const chatModel = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite-preview",
  maxOutputTokens: 2048,
  temperature: 0.1, // Even lower temperature for strict categorization
  apiKey: process.env.GOOGLE_API_KEY
});

exports.handlePatientChat = async (req, res) => {
  try {
    const { patientId, message, history, location, language } = req.body; 
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const selectedLanguage = language || 'English';

    // 1. UPDATED PROMPT: Force the AI to remember THIS IS the emergency system.
    const systemPrompt = `
      You are MedAssist, an emergency medical triage AI built directly into a hospital dispatch network.
      The patient is communicating in: ${selectedLanguage}.
      
      YOUR GOAL: Assess if symptoms are CRITICAL or NON_CRITICAL.
      
      RULES:
      1. Provide your "reply" and "immediate_actions" in ${selectedLanguage}.
      2. Categorize the emergency into EXACTLY ONE of these English terms for the "disease" field: 
         ['Heart Attack', 'Stroke', 'Cardiac Arrest', 'Severe Asthma Attack', 'Severe External Bleeding', 'Brain Hemorrhage', 'Seizure', 'Snake Bite', 'Other'].
      3. STRICT RULE: DO NOT EVER tell the patient to call emergency services, 911, or an ambulance. THIS APP IS THE EMERGENCY DISPATCH. Tell them "I am alerting the nearest hospital" or "Help is on the way."
      4. OUTPUT ONLY VALID JSON. Do not use markdown blocks.
      
      OUTPUT FORMAT:
      {
        "reply": "Your empathetic response in ${selectedLanguage} (Do not say call 911)", 
        "severity": "CRITICAL" | "NON_CRITICAL", 
        "disease": "Exact English term from the list",
        "immediate_actions": ["Action 1", "Action 2"]
      }
    `;

    const messages = [new SystemMessage(systemPrompt)];
    if (history) history.forEach(msg => messages.push(msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)));
    messages.push(new HumanMessage(message));

    const response = await chatModel.invoke(messages);
    
    let aiData;
    try {
      // Safely extract JSON even if Gemini acts weird
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
      
      // Clean the string to ensure exact matching
      const predictedDisease = aiData.disease.trim();
      
      // STRICT MONGODB QUERY: Must have ambulances AND the exact disease MUST be toggled to TRUE.
      const availableHospital = await Hospital.findOne({
        availableAmbulances: { $gt: 0 },
        specialties: { 
          $elemMatch: { 
            disease: predictedDisease, 
            isAvailable: true // This absolutely forces the database to respect your toggle
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

      // Create the emergency record
      const newEmergency = await Emergency.create({
        patient: patient._id,
        assignedHospital: hospitalIdToAssign,
        location: location || { lat: 0, lng: 0 },
        symptomsReported: message,
        aiPredictedDisease: predictedDisease,
        severity: 'CRITICAL',
        status: isAmbulanceAssigned ? 'DISPATCHED' : 'SEARCHING_AMBULANCE'
      });

      // Only send the socket alert to the hospital if they were actually assigned!
      if (isAmbulanceAssigned) {
        const io = req.app.get('socketio');
        // We can use broadcast or emit. We'll emit to all connected hospital dashboards.
        io.emit('new_emergency', {
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
      reply: aiData.reply,
      isEmergencyDispatched,
      isAmbulanceAssigned,
      disease: aiData.disease,
      immediate_actions: aiData.immediate_actions || [],
      hospitalName: assignedHospitalName
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
};