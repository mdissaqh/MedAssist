const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, AIMessage } = require('@langchain/core/messages'); // SystemMessage removed
const Emergency = require('../models/Emergency');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');

// ==========================================
// 1. GEMMA CONFIGURATION
// ==========================================
const chatModel = new ChatGoogleGenerativeAI({
  model: "gemma-3-27b-it", 
  maxOutputTokens: 400, // Safe limit for your 15k TPM quota
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
    // 2. PROMPT RULES
    // ==========================================
    const systemPrompt = `
      You are MedAssist, an emergency medical triage AI. The patient is speaking in: ${selectedLanguage}.

      CRITICAL DISPATCH RULES:
      If symptoms match exactly ONE of these severe conditions: ['Heart Attack', 'Stroke', 'Cardiac Arrest', 'Severe Asthma Attack', 'Severe External Bleeding', 'Brain Hemorrhage', 'Seizure', 'Snake Bite'].
      1. Set "severity" to "CRITICAL".
      2. Set "disease" to the exact English term from the list above.
      3. Your "reply" must be: "I am alerting the nearest hospital. Help is on the way." (Translated to ${selectedLanguage}). Do NOT tell them to call 911.

      NON-DISPATCH ADVICE RULES:
      If symptoms are NOT severe or do NOT fall on the critical list (e.g., 'Feeling Cold', 'Slight Headache', 'Stomach ache'):
      1. Set "severity" to "NON_CRITICAL".
      2. Set "disease" to "None".
      3. Your "reply" MUST provide detailed general medical advice in ${selectedLanguage}. Tell them why it might be happening, comfort steps, and when to see a doctor. Do NOT say you are allocating a hospital.

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
    // 3. HISTORY TRIM
    // ==========================================
    let trimmedHistory = [];
    if (history && history.length > 0) {
      trimmedHistory = history.slice(-4); 
    }

    // ==========================================
    // 4. THE FIX: Combine Rules + Patient Message
    // Gemma doesn't support SystemMessage, so we pass the rules inside the final HumanMessage
    // ==========================================
    const messages = [];
    
    // Add the trimmed history first
    trimmedHistory.forEach(msg => {
      messages.push(msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content));
    });

    // Inject the system prompt and the user's new message into a single HumanMessage
    const combinedFinalMessage = `
--- SYSTEM INSTRUCTIONS FOR MEDASSIST AI ---
${systemPrompt}

--- CURRENT PATIENT MESSAGE ---
${message}
    `;
    
    messages.push(new HumanMessage(combinedFinalMessage));

    // Wait for the AI response
    const response = await chatModel.invoke(messages);
    
    let aiData;
    try {
      let cleanText = response.content.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      aiData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("AI Parse Error:", response.content);
      aiData = { 
        reply: "Help is on the way. Please stay calm while I connect you to the nearest hospital.", 
        severity: "CRITICAL", 
        disease: "Other", 
        immediate_actions: ["Sit down and rest"] 
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
      reply: aiData.reply,
      isEmergencyDispatched,
      isAmbulanceAssigned,
      disease: aiData.disease,
      immediate_actions: aiData.immediate_actions || [],
      hospitalName: assignedHospitalName,
      severity: aiData.severity
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
};