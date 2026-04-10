import React, { useState } from 'react';
import LiveAmbulanceMap from './LiveAmbulanceMap';
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
    messages, inputValue, setInputValue, isLoading, sendMessage, messagesEndRef, 
    isDispatched, predictedDisease, immediateActions, 
    assignedHospitalName
  } = usePatientChat(selectedLanguage);
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage(inputValue, selectedLanguage);
  };

  // --- EMERGENCY TRIGGERED SCREEN ---
  // --- EMERGENCY TRIGGERED SCREEN ---
  if (isDispatched) {
    // Check if a hospital was actually assigned
    const isAssigned = Boolean(assignedHospitalName);

    return (
      <motion.div 
        className="dispatch-screen"
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div 
          className="pulse-ring"
          animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }} transition={{ repeat: Infinity, duration: 2 }}
        >
          <ShieldAlert size={80} color="white" />
        </motion.div>
        
        {/* ========================================== */}
        {/* 1. MASSIVE WARNING IF NO HOSPITAL IS FOUND */}
        {/* ========================================== */}
        {!isAssigned && (
          <div style={{ background: '#fef08a', color: '#991b1b', padding: '20px', borderRadius: '12px', margin: '20px 0', border: '4px solid #facc15', textAlign: 'center', width: '90%', maxWidth: '450px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              ⚠️ NETWORK UNAVAILABLE
            </h3>
            <p style={{ margin: '15px 0', fontWeight: 'bold', fontSize: '1.1rem' }}>
              No hospital with '<span style={{textDecoration: 'underline'}}>{predictedDisease}</span>' services is currently available in your area.
            </p>
            <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#dc2626', background: 'white', padding: '10px', borderRadius: '8px', border: '2px solid #dc2626' }}>
              PLEASE CALL LOCAL EMERGENCY SERVICES IMMEDIATELY!
            </h2>
          </div>
        )}

        {/* ========================================== */}
        {/* 2. SUCCESS MESSAGE IF HOSPITAL IS ASSIGNED */}
        {/* ========================================== */}
        {isAssigned && (
          <div style={{ width: '100%', maxWidth: '600px' }}>
            <h2>AMBULANCE DISPATCHED</h2>
            <div style={{ background: '#dcfce7', color: '#166534', padding: '15px', borderRadius: '12px', margin: '15px auto', textAlign: 'center', border: '2px solid #22c55e' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>✅ Hospital Assigned:</h3>
              <h2 style={{ margin: '5px 0 0 0', fontSize: '1.5rem' }}>{assignedHospitalName}</h2>
            </div>
            
            {/* NEW: THE LIVE TRACKING MAP! */}
            <LiveAmbulanceMap 
              hospitalName={assignedHospitalName} 
              patientLat={location?.lat} 
              patientLng={location?.lng} 
            />
          </div>
        )}

        <p className="disease-alert" style={{ marginTop: isAssigned ? '0' : '10px' }}>Code: {predictedDisease}</p>
        
        <div className="instructions">
          <h3>Immediate Actions:</h3>
          <ul>
            {immediateActions && immediateActions.length > 0 ? (
              immediateActions.map((action, idx) => <li key={idx}>{action}</li>)
            ) : (
              <li>Please stay as calm as possible.</li>
            )}
          </ul>
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