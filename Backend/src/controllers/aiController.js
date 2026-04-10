const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
const Emergency = require('../models/Emergency');
const Patient = require('../models/Patient');

// Initialize Gemini Pro via LangChain
const chatModel = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite-preview", // Fast and great for reasoning
  maxOutputTokens: 2048,
  temperature: 0.2, // Keep it low so the medical advice is focused, not creative
  apiKey: process.env.GOOGLE_API_KEY
});

exports.handlePatientChat = async (req, res) => {
  try {
    const { patientId, message, history, location } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // 1. STRICER SYSTEM PROMPT
    const systemPrompt = `
      You are MedAssist, an emergency medical triage AI.
      You are speaking with a patient. 
      Patient Info: Mobile: ${patient.mobileNumber}, Language: ${patient.preferredLanguage}.
      
      YOUR GOAL: Assess if their symptoms are CRITICAL (requires immediate ambulance) or NON_CRITICAL.
      
      RULES:
      1. Reply in the patient's preferred language or the language they type in.
      2. Keep responses short and empathetic.
      3. If they report symptoms of heart attack, stroke, severe trauma, breathing failure, etc., classify as CRITICAL.
      4. YOU MUST OUTPUT STRICTLY VALID JSON. DO NOT OUTPUT ANY OTHER TEXT. NO GREETINGS. NO MARKDOWN.
      
      OUTPUT FORMAT (Always follow this exactly):
      {"reply": "your message to the patient here", "severity": "CRITICAL" | "NON_CRITICAL", "disease": "Predicted condition or 'Unknown'"}
    `;

    const messages = [new SystemMessage(systemPrompt)];
    
    if (history && history.length > 0) {
      history.forEach(msg => {
        if (msg.role === 'user') messages.push(new HumanMessage(msg.content));
        if (msg.role === 'ai') messages.push(new AIMessage(msg.content));
      });
    }
    
    messages.push(new HumanMessage(message));

    // Call Gemini
    const response = await chatModel.invoke(messages);
    
    // 2. CLEVER JSON EXTRACTION
    let aiData;
    try {
      // Find exactly where the { starts and the } ends, ignoring all text outside it!
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        aiData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON object found in response");
      }
    } catch (parseError) {
      console.error("AI didn't follow rules. Raw Response:", response.content);
      // 3. FALLBACK SAFETY NET (So the app never crashes)
      aiData = {
        reply: "I am having trouble processing that. If you are experiencing a severe medical emergency, please click a symptom button or describe it clearly.",
        severity: "NON_CRITICAL",
        disease: "Unknown"
      };
    }

    // Check for Critical Trigger
    let isEmergencyDispatched = false;
    
    if (aiData.severity === 'CRITICAL') {
      isEmergencyDispatched = true;
      
      const newEmergency = await Emergency.create({
        patient: patient._id,
        location: location || { lat: 0, lng: 0 },
        symptomsReported: message,
        aiPredictedDisease: aiData.disease,
        severity: 'CRITICAL',
        status: 'SEARCHING_AMBULANCE',
        aiChatTranscript: history
      });

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

    res.json({
      reply: aiData.reply,
      isEmergencyDispatched,
      disease: aiData.disease
    });

  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
};