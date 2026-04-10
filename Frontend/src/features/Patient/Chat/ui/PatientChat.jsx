import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePatientChat } from '../hooks/usePatientChat';
import { Send, MapPin, AlertCircle, ShieldAlert, Globe } from 'lucide-react';
import './PatientChat.scss';

// These are SYMPTOMS (what the patient feels), which map safely to the 8 Major Diseases in the backend AI prompt.
const SYMPTOMS_DICT = {
  'English': ["Crushing Chest Pain", "Sudden Weakness/Speech Loss", "No Pulse/Collapsed", "Severe Breathing Issue", "Deep Cut/Heavy Bleeding", "Worst Headache Ever", "Convulsions/Shaking", "Animal/Snake Bite"],
  'Hindi': ["सीने में भारी दर्द", "अचानक कमजोरी/बोलने में दिक्कत", "नाड़ी नहीं/बेहोश", "सांस लेने में गंभीर समस्या", "गहरा घाव/भारी खून", "भयानक सिरदर्द", "दौरे/कांपना", "सांप/जानवर का काटना"],
  'Kannada': ["ತೀವ್ರ ಎದೆ ನೋವು", "ಹಠಾತ್ ದೌರ್ಬಲ್ಯ/ಮಾತು ನಿಲ್ಲುವಿಕೆ", "ನಾಡಿ ಇಲ್ಲ/ಕುಸಿತ", "ಉಸಿರಾಟದ ತೊಂದರೆ", "ಆಳವಾದ ಗಾಯ/ರಕ್ತಸ್ರಾವ", "ತೀವ್ರ ತಲೆನೋವು", "ಸೆಳೆತ/ನಡುಕ", "ಹಾವು/ಪ್ರಾಣಿ ಕಡಿತ"],
  'Tamil': ["கடுமையான நெஞ்சு வலி", "திடீர் பலவீனம்/பேச்சு இழப்பு", "நாடி இல்லை/மயக்கம்", "கடுமையான மூச்சுத்திணறல்", "ஆழமான வெட்டு/இரத்தப்போக்கு", "கடுமையான தலைவலி", "வலிப்பு/நடுக்கம்", "பாம்பு/விலங்கு கடி"],
  'Telugu': ["తీవ్రమైన ఛాతీ నొప్పి", "ఆకస్మిక బలహీనత/మాట కోల్పోవడం", "పల్స్ లేదు/కుప్పకూలడం", "తీవ్రమైన శ్వాస సమస్య", "లోతైన కోత/భారీ రక్తస్రావం", "తీవ్రమైన తలనొప్పి", "మూర్ఛలు/వణుకు", "పాము/జంతువు కాటు"]
};

const PatientChat = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  // Pass the language into the hook so the greeting translates instantly
  const {
    messages, inputValue, setInputValue, isLoading, sendMessage, messagesEndRef, isDispatched, predictedDisease, immediateActions
  } = usePatientChat(selectedLanguage);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage(inputValue, selectedLanguage);
  };

  if (isDispatched) {
    return (
      <motion.div className="dispatch-screen" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <motion.div className="pulse-ring" animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }} transition={{ repeat: Infinity, duration: 2 }}>
          <ShieldAlert size={80} color="white" />
        </motion.div>
        <h2>EMERGENCY TRIGGERED</h2>
        <p className="disease-alert">Code: {predictedDisease}</p>
        
        <div className="instructions">
          <h3>Immediate Actions:</h3>
          <ul>
            {immediateActions && immediateActions.length > 0 ? (
              immediateActions.map((action, idx) => <li key={idx}>{action}</li>)
            ) : (
              <li>Help is on the way. Please stay calm.</li>
            )}
          </ul>
        </div>
        
        {/* NEW: Only say assigned if it actually is! */}
        <div style={{ marginTop: '2rem', padding: '10px', background: 'white', color: 'black', borderRadius: '8px', fontWeight: 'bold' }}>
           {assignedHospitalName ? (
             <p>🚑 Ambulance Assigned from: {assignedHospitalName}</p>
           ) : (
             <p>⚠️ Alerting network... Searching for available ambulance.</p>
           )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="patient-chat-container">
      <header className="chat-header">
        <div className="header-title">
          <AlertCircle color="#d32f2f" size={24} />
          <h2>MedAssist</h2>
        </div>
        
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Globe size={18} color="#666" />
          <select 
            value={selectedLanguage} 
            onChange={(e) => setSelectedLanguage(e.target.value)}
            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}
          >
            {Object.keys(SYMPTOMS_DICT).map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="chat-window">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div key={index} className={`chat-bubble ${msg.role}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {msg.content}
            </motion.div>
          ))}
          {isLoading && (
            <motion.div className="chat-bubble ai loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span className="dot"></span><span className="dot"></span><span className="dot"></span>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        {/* Shows the 8 Symptom buttons matching the 8 Major Diseases in the selected language */}
        {messages.length <= 3 && (
          <div className="quick-symptoms" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {SYMPTOMS_DICT[selectedLanguage].map((symp, i) => (
              <button key={i} onClick={() => sendMessage(symp, selectedLanguage)} disabled={isLoading} style={{ fontSize: '0.85rem' }}>
                {symp}
              </button>
            ))}
          </div>
        )}

        <div className="typing-area">
          <input type="text" placeholder="..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={handleKeyPress} disabled={isLoading} />
          <button className="send-btn" onClick={() => sendMessage(inputValue, selectedLanguage)} disabled={isLoading || !inputValue.trim()}><Send size={20} /></button>
        </div>
      </div>
    </div>
  );
};

export default PatientChat;