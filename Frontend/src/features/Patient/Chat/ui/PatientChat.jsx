import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePatientChat } from '../hooks/usePatientChat';
import { Send, MapPin, AlertCircle, ShieldAlert } from 'lucide-react';
import './PatientChat.scss';

const QUICK_SYMPTOMS = ["Chest Pain", "Difficulty Breathing", "Severe Bleeding", "Unconscious"];

const PatientChat = () => {
  const {
    messages, inputValue, setInputValue, isLoading, sendMessage, messagesEndRef, isDispatched, predictedDisease
  } = usePatientChat();

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage(inputValue);
  };

  // --- AMBULANCE DISPATCHED SCREEN ---
  if (isDispatched) {
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
        <h2>AMBULANCE DISPATCHED</h2>
        <p className="disease-alert">Suspected: {predictedDisease}</p>
        <div className="instructions">
          <h3>Immediate Actions:</h3>
          <ul>
            <li>Unlock the main door.</li>
            <li>Have the patient sit or lie down.</li>
            <li>Gather any current medications.</li>
            <li>Do NOT give them food or water right now.</li>
          </ul>
        </div>
        <p className="eta">Nearest Hospital Notified. Help is on the way.</p>
      </motion.div>
    );
  }

  // --- NORMAL CHAT SCREEN ---
  return (
    <div className="patient-chat-container">
      <header className="chat-header">
        <div className="header-title">
          <AlertCircle color="#d32f2f" size={24} />
          <h2>MedAssist Triage</h2>
        </div>
        <span className="location-status"><MapPin size={16}/> GPS Active</span>
      </header>

      <div className="chat-window">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div 
              key={index}
              className={`chat-bubble ${msg.role}`}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
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
        {/* Quick Symptoms (Only show if few messages exist to save space) */}
        {messages.length <= 3 && (
          <div className="quick-symptoms">
            {QUICK_SYMPTOMS.map((symp, i) => (
              <button key={i} onClick={() => sendMessage(symp)} disabled={isLoading}>
                {symp}
              </button>
            ))}
          </div>
        )}

        <div className="typing-area">
          <input 
            type="text" 
            placeholder="Type your symptoms here..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button className="send-btn" onClick={() => sendMessage(inputValue)} disabled={isLoading || !inputValue.trim()}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientChat;