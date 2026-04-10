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
    // NEW: Accept language from frontend
    const { patientId, message, history, location, language } = req.body; 

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const selectedLanguage = language || 'English';

    // 1. THE BILINGUAL SYSTEM PROMPT
    const systemPrompt = `
      You are MedAssist, an emergency medical triage AI.
      The patient is communicating in: ${selectedLanguage}.
      
      YOUR GOAL: Assess if symptoms are CRITICAL or NON_CRITICAL.
      
      RULES:
      1. You MUST translate and provide your "reply" and "immediate_actions" in ${selectedLanguage}.
      2. You MUST categorize the emergency into EXACTLY ONE of these English terms for the "disease" field: 
         ['Heart Attack', 'Stroke', 'Cardiac Arrest', 'Severe Asthma Attack', 'Severe External Bleeding', 'Brain Hemorrhage', 'Seizure', 'Snake Bite', 'Other']. DO NOT translate the "disease" field.
      3. YOU MUST OUTPUT STRICTLY VALID JSON. NO OTHER TEXT.
      
      OUTPUT FORMAT:
      {
        "reply": "Your empathetic response in ${selectedLanguage}", 
        "severity": "CRITICAL" | "NON_CRITICAL", 
        "disease": "Must be the exact English term from the list",
        "immediate_actions": ["Action 1 in ${selectedLanguage}", "Action 2 in ${selectedLanguage}"]
      }
    `;

    const messages = [new SystemMessage(systemPrompt)];
    if (history) {
      history.forEach(msg => {
        messages.push(msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content));
      });
    }
    messages.push(new HumanMessage(message));

    const response = await chatModel.invoke(messages);
    
    let aiData;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      aiData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      aiData = { reply: "Error processing. Please call emergency services directly.", severity: "NON_CRITICAL", disease: "Other", immediate_actions: [] };
    }

    let isEmergencyDispatched = false;
    let assignedHospitalName = "Searching...";
    
    // 2. THE SMART DISPATCH LOGIC
    if (aiData.severity === 'CRITICAL') {
      isEmergencyDispatched = true;
      
      // Find a hospital that treats this EXACT disease, has it turned ON, and has an ambulance!
      const availableHospital = await Hospital.findOne({
        'specialties': { 
          $elemMatch: { disease: aiData.disease, isAvailable: true } 
        },
        availableAmbulances: { $gt: 0 }
      });

      let hospitalIdToAssign = null;
      if (availableHospital) {
        hospitalIdToAssign = availableHospital._id;
        assignedHospitalName = availableHospital.name;
        
        // Decrease ambulance count by 1 (Atomic update)
        availableHospital.availableAmbulances -= 1;
        await availableHospital.save();
      }

      const newEmergency = await Emergency.create({
        patient: patient._id,
        assignedHospital: hospitalIdToAssign,
        location: location || { lat: 0, lng: 0 },
        symptomsReported: message,
        aiPredictedDisease: aiData.disease,
        severity: 'CRITICAL',
        status: 'DISPATCHED'
      });

      // Notify the specific hospital
      const io = req.app.get('socketio');
      io.emit('new_emergency', {
        id: newEmergency._id,
        patientMobile: patient.mobileNumber,
        address: "Location coordinates received",
        symptoms: message,
        predictedDisease: aiData.disease,
        eta: "8 Mins", 
      });
    }

    // 3. Send data back to the Patient UI
    res.json({
      reply: aiData.reply,
      isEmergencyDispatched,
      disease: aiData.disease,
      immediate_actions: aiData.immediate_actions || [],
      hospitalName: assignedHospitalName
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to process chat" });
  }
};