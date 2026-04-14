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
  maxOutputTokens: 400, // REDUCED: The AI only needs ~150-300 tokens for advice + JSON. 400 is a safe ceiling.
  temperature: 0.1, 
  apiKey: process.env.GOOGLE_API_KEY,
  streaming: true,
  maxRetries: 0 // Fail fast, don't hang Render
});

exports.handlePatientChat = async (req, res) => {
  try {
    const { patientId, message, history, location, language } = req.body; 
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const selectedLanguage = language || 'English';
    const io = req.app.get('socketio');

    // ==========================================
    // 2. AVOID THE RENDER 500 TIMEOUT ERROR
    // Immediately close the HTTP request so the frontend doesn't hang!
    // ==========================================
    res.status(200).json({ status: "processing_started", message: "AI is processing via sockets..." });

    // ==========================================
    // 3. INPUT TOKEN OPTIMIZATION (Crucial for 15k TPM)
    // Keep only the last 4 messages (2 interactions) to prevent the context window from blowing up the TPM limit.
    // ==========================================
    let trimmedHistory = [];
    if (history && history.length > 0) {
      trimmedHistory = history.slice(-4); 
    }

    // Run the heavy AI lifting in the background
    processAiAndStreamInBackground(req, patient, patientId, message, trimmedHistory, location, selectedLanguage, io)
      .catch(err => {
        console.error("Background AI Error:", err);
        io.to(patientId.toString()).emit('chat_classification_final', {
          isEmergencyDispatched: false,
          disease: "System Error",
          immediate_actions: ["I am currently experiencing network issues. Please try again or call local emergency services if urgent."],
          severity: "NON_CRITICAL"
        });
      });

  } catch (error) {
    console.error("Server Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to initiate chat process" });
    }
  }
};

// ==========================================
// BACKGROUND STREAMING LOGIC
// ==========================================
const processAiAndStreamInBackground = async (req, patient, patientId, message, history, location, selectedLanguage, io) => {
  try {
    console.log(`\n🚀 [Gemma Task Started] Processing message for patient: ${patientId}`);
    
    // We keep the prompt tight to save input tokens
    const systemPrompt = `
      You are MedAssist, an empathetic medical triage AI. Language: ${selectedLanguage}.
      
      CRITICAL DISPATCH RULES:
      If symptoms indicate a severe condition on this EXACT list: ['Heart Attack', 'Stroke', 'Cardiac Arrest', 'Severe Asthma Attack', 'Severe External Bleeding', 'Brain Hemorrhage', 'Seizure', 'Snake Bite'].
      You MUST create an immediate medical alert. The 'disease' field must match the list. Say "Alerting nearest hospital, help is on the way." Do NOT tell them to call emergency services.
      
      NON-DISPATCH ADVICE RULES:
      If symptoms are not severe (e.g., 'Feeling Cold', 'Slight Headache'). You MUST NOT allocate a hospital. 
      Your reply MUST provide general medical advice: 1. Explanations. 2. Comfort steps. 3. When to see a doctor.
      
      OUTPUT FORMAT:
      Output continuous empathetic advice. At the VERY END, output this delimiter: '[[|JSON_DATA|]]' followed by JSON. No markdown.
      
      JSON DATA FORMAT:
      {
        "severity": "CRITICAL" | "NON_CRITICAL",
        "disease": "Exact English term or empty",
        "immediate_actions": ["Action 1", "Action 2"]
      }
    `;

    const messages = [new SystemMessage(systemPrompt)];
    
    // Apply the trimmed history
    history.forEach(msg => {
      messages.push(msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content));
    });
    messages.push(new HumanMessage(message));

    const stream = await chatModel.stream(messages);
    
    let fullResponse = "";
    let jsonExtracted = false;

    for await (const chunk of stream) {
      const token = chunk.content;
      fullResponse += token;
      
      if (!jsonExtracted) {
        if (fullResponse.includes('[[|JSON_DATA|]]')) {
          jsonExtracted = true;
          const parts = fullResponse.split('[[|JSON_DATA|]]');
          handleClassificationLogicAsync(req, parts[1], patient, patientId, message, location, io);
        } else if (!fullResponse.includes('[[|')) {
          if (token) {
            io.to(patientId.toString()).emit('stream_token', { token });
          }
        }
      }
    }

    if (!jsonExtracted) {
      handleClassificationLogicAsync(req, fullResponse, patient, patientId, message, location, io);
    }

  } catch (error) {
    console.error("❌ [Gemma Background Error]:", error);
    io.to(patientId.toString()).emit('chat_classification_final', {
      isEmergencyDispatched: false,
      disease: "System Error",
      immediate_actions: ["I am currently experiencing network issues. Please try again."],
      severity: "NON_CRITICAL"
    });
  }
};

// ==========================================
// PARALLEL LOGIC (Database updates)
// ==========================================
const handleClassificationLogicAsync = async (req, jsonText, patient, patientId, userMessage, location, io) => {
  let aiData;
  try {
    const cleanText = jsonText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    aiData = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    aiData = { severity: 'NON_CRITICAL', disease: 'Other', immediate_actions: ['Stay calm.'] };
  }

  let isEmergencyDispatched = false;
  let isAmbulanceAssigned = false;
  let assignedHospitalName = null;
  let hospitalIdToAssign = null;
  const predictedDisease = aiData.disease ? aiData.disease.trim() : "";

  if (aiData.severity === 'CRITICAL') {
    isEmergencyDispatched = true;
    
    const availableHospital = await Hospital.findOne({
      availableAmbulances: { $gt: 0 },
      specialties: { $elemMatch: { disease: predictedDisease, isAvailable: true } }
    });

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
      symptomsReported: userMessage,
      aiPredictedDisease: predictedDisease,
      severity: 'CRITICAL',
      status: isAmbulanceAssigned ? 'DISPATCHED' : 'SEARCHING_AMBULANCE'
    });

    if (isAmbulanceAssigned) {
      io.to(hospitalIdToAssign.toString()).emit('new_emergency', {
        id: newEmergency._id,
        patientMobile: patient.mobileNumber,
        address: location ? `Lat: ${location.lat}, Lng: ${location.lng}` : "Location pending...",
        symptoms: userMessage,
        predictedDisease: predictedDisease,
        eta: "8 Mins", 
      });
    }
  }

  if (io && patientId) {
    io.to(patientId.toString()).emit('chat_classification_final', {
      isEmergencyDispatched,
      isAmbulanceAssigned,
      disease: aiData.disease,
      immediate_actions: aiData.immediate_actions || [],
      hospitalName: assignedHospitalName
    });
  }
};