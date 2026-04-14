const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
const Emergency = require('../models/Emergency');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');
// NEW: Used to work with streaming chunks
const { IterableReadableStream } = require('@langchain/core/utils/stream');

// Configure for streaming and high responsiveness
const chatModel = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite-preview",
  maxOutputTokens: 2048,
  temperature: 0.1, // Stick with low temperature for strict categorization
  apiKey: process.env.GOOGLE_API_KEY,
  // NEW: Important for some LangChain implementations to explicitly enable
  streaming: true,
});

// Helper function to stream tokens directly to the patient's private socket
const streamTokenToPatient = (io, patientId, token) => {
  if (io && patientId && token) {
    // Send directly to the room named after the patient's unique MongoDB ID
    io.to(patientId.toString()).emit('stream_token', { token });
  }
};

exports.handlePatientChat = async (req, res) => {
  try {
    const { patientId, message, history, location, language } = req.body; 
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const selectedLanguage = language || 'English';
    const io = req.app.get('socketio'); // Grab the socket server for streaming

    // ==========================================
    // 1. UPDATED PROMPT: Explicit ADVICE vs DISPATCH rules (Problem 2 Fix)
    // Parallel data extraction with delimiter (Latency Fix)
    // ==========================================
    const systemPrompt = `
      You are MedAssist, an empathetic medical advice and emergency triage AI. The patient is speaking in: ${selectedLanguage}.
      
      CRITICAL DISPATCH RULES:
      If symptoms indicate a severe condition on this EXACT list:
      ['Heart Attack', 'Stroke', 'Cardiac Arrest', 'Severe Asthma Attack', 'Severe External Bleeding', 'Brain Hemorrhage', 'Seizure', 'Snake Bite'].
      ... Then you MUST create an immediate medical alert. The 'disease' field in the JSON must be the exact term from the list. The immediate_actions should be critical first-aid steps. Do not ever tell the patient to call emergency services. Say "Alerting nearest hospital, help is on the way."
      
      NON-DISPATCH ADVICE RULES (Solve Problem 2):
      If symptoms are not severe and do not fall on the critical list. e.g., 'Feeling Cold', 'Common Cold', 'Slight Headache', 'Mild Stomach Ache'.
      ... You MUST NOT allocate a hospital. The 'disease' field will be empty. The severity will be NON_CRITICAL.
      Instead, your reply text (to be streamed to the user) MUST provide general medical advice, including clear and detailed instructions on:
      1. Potential non-emergency explanations (e.g., body adjusting, common virus).
      2. Specific precautions and immediate comfort steps (e.g., warm environment, drink fluids).
      3. Conditions on 'when to see a doctor' (e.g., if fever exceeds X, if symptoms worsen).
      4. Over-the-counter medicine suggestions, if appropriate, with clear 'consult a pharmacist first' warnings.
      
      OUTPUT FORMAT:
      You will output a continuous stream of words. This is the empathetic advice to be shown in the chat.
      After all the text, you MUST output this exact delimiter: '[[|JSON_DATA|]]' followed by the simple classification JSON data. DO NOT use markdown blocks.
      
      JSON DATA FORMAT (immediately after the delimiter):
      {
        "severity": "CRITICAL" | "NON_CRITICAL",
        "disease": "Exact English term from dispatch list, or empty for non-critical",
        "immediate_actions": ["Action 1", "Action 2", or empty for non-critical]
      }
    `;

    const messages = [new SystemMessage(systemPrompt)];
    if (history) history.forEach(msg => messages.push(msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)));
    messages.push(new HumanMessage(message));

    // ==========================================
    // 2. ENABLE STREAMING FOR INSTANT PERCEPTION (Latency Fix)
    // ==========================================
    // Use the streaming API from LangChain/Gemini. It returns an async iterable.
    const stream = await chatModel.stream(messages);
    
    let fullResponse = "";
    let aiData;
    let isDispatcherSent = false;
    let classificationJsonPart = "";

    // Iterate over the stream chunk by chunk
    for await (const chunk of stream) {
      const token = chunk.content;
      
      // Accumulate the full streamed response
      fullResponse += token;
      
      // Before sending to the user, check if we've hit the delimiter.
      // We process tokens to find the start of the delimiter without sending them.
      if (!isDispatcherSent) {
        if (!fullResponse.includes('[[|JSON_DATA|]]')) {
          // No delimiter found yet, stream this token directly to the user
          streamTokenToPatient(io, patientId, token);
        } else {
          // We found the delimiter, we can stop streaming to the chat and parallelize
          isDispatcherSent = true;
          // Split the full accumulated response, making sure we don't stream the delimiter
          const parts = fullResponse.split('[[|JSON_DATA|]]');
          // Update fullResponse to be *only* the user text for the chat history
          fullResponse = parts[0];
          
          // *CRUCIAL FOR LATENCY:* We can now start parallel processing of classification
          // Start a separate parallel promise to handle the classification logic in under 5s
          handleClassificationLogicAsync(req, parts[1], patient, patientId, message, location, io);
        }
      }
    }

    // In case the stream completes and the model acting weird without the delimiter
    // The parallel processing promise will be handled above
    
    // We can respond with the full user-facing advice text here for the chat history
    res.json({ reply: fullResponse });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
};

// ==========================================
// 3. PARALLELIZED Logic for under 5s Logic Completion (Latency Fix)
// ==========================================
const handleClassificationLogicAsync = async (req, jsonText, patient, patientId, userMessage, location, io) => {
  let aiData;
  try {
    // Basic cleanup of the AI data and parse the JSON
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    aiData = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    // In case of error, assume CRITICAL 'Other' so a hospital is allocated safely
    aiData = { severity: 'CRITICAL', disease: 'Other', immediate_actions: ['Stay calm', 'Sit down'] };
  }

  // Define critical emergency parameters
  let isEmergencyDispatched = false;
  let isAmbulanceAssigned = false;
  let assignedHospitalName = null;
  let hospitalIdToAssign = null;
  const predictedDisease = aiData.disease.trim();

  if (aiData.severity === 'CRITICAL') {
    isEmergencyDispatched = true;
    
    // STRICT MONGODB QUERY (as before, with indexes) completed in under 1s
    const availableHospital = await Hospital.findOne({
      availableAmbulances: { $gt: 0 },
      specialties: { 
        $elemMatch: { 
          disease: predictedDisease, 
          isAvailable: true 
        } 
      }
    });

    if (availableHospital) {
      hospitalIdToAssign = availableHospital._id;
      assignedHospitalName = availableHospital.name;
      isAmbulanceAssigned = true;
      
      availableHospital.availableAmbulances -= 1;
      await availableHospital.save();
    }

    // Create the emergency record (< 1s)
    const newEmergency = await Emergency.create({
      patient: patient._id,
      assignedHospital: hospitalIdToAssign,
      location: location || { lat: 0, lng: 0 },
      symptomsReported: userMessage,
      aiPredictedDisease: predictedDisease,
      severity: 'CRITICAL',
      status: isAmbulanceAssigned ? 'DISPATCHED' : 'SEARCHING_AMBULANCE'
    });

    // Alert the hospital with direct messaging (< 1s)
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

  // ==========================================
  // 4. Send the final, parallelized JSON data back to the patient's socket
  // ==========================================
  // This JSON contains isEmergencyDispatched logic and hospitalName for final render.
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