import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { sendChatMessageApi } from '../api/chatApi';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client'; // Import socket

const SOCKET_SERVER_URL = 'https://medassist-ufl5.onrender.com'; // Your socket server

const GREETINGS = {
  'English': 'Hello. I am MedAssist AI. Please click a symptom below or describe your emergency.',
  'Hindi': 'नमस्ते। मैं मेडअसिस्ट एआई हूं। कृपया नीचे एक लक्षण पर क्लिक करें या अपनी आपात स्थिति का वर्णन करें।',
  'Kannada': 'ನಮಸ್ಕಾರ. ನಾನು ಮೆಡ್‌ಅಸಿಸ್ಟ್ ಎಐ. ದಯವಿಟ್ಟು ಕೆಳಗಿನ ರೋಗಲಕ್ಷಣವನ್ನು ಕ್ರಿಕ್ ಮಾಡಿ ಅಥವಾ ನಿಮ್ಮ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯನ್ನು ವಿವರಿಸಿ.',
  'Tamil': 'வணக்கம். நான் MedAssist AI. கீழே உள்ள அறிகுறியைக் கிளிக் செய்யவும் அல்லது உங்கள் அவசரநிலையை விவரிக்கவும்.',
  'Telugu': 'నమస్కారం. నేను MedAssist AI. దయచేసి క్రింద ఉన్న లక్షణాన్ని క్లిక్ చేయండి లేదా మీ అత్యవసర పరిస్థితిని వివరించండి.'
};

export const usePatientChat = (selectedLanguage) => {
  const { user } = useSelector((state) => state.auth);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(null);
  
  // Emergency States
  const [isDispatched, setIsDispatched] = useState(false);
  const [predictedDisease, setPredictedDisease] = useState('');
  const [immediateActions, setImmediateActions] = useState([]);
  const [assignedHospitalName, setAssignedHospitalName] = useState(null);
  const [severity, setSeverity] = useState(null); // Keep severity state

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null); // NEW: Use ref to keep socket stable

  // GREETING
  useEffect(() => {
    setMessages([{ role: 'ai', content: GREETINGS[selectedLanguage] }]);
  }, [selectedLanguage]);

  // GEOLOCATION
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => toast.error("Please allow location access.")
      );
    }
  }, []);

  // SCROLL TO BOTTOM
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ==========================================
  // 1. Setup Socket to listen for streaming tokens
  // ==========================================
  useEffect(() => {
    if (!user?._id) return;

    socketRef.current = io(SOCKET_SERVER_URL);
    // Securely join a private room named after the patient's MongoDB ID
    socketRef.current.emit('join_hospital_room', user._id);

    // Listener for new tokens
    socketRef.current.on('stream_token', (data) => {
      setMessages((prev) => {
        // Find the last AI message
        const lastMessageIndex = prev.length - 1;
        if (lastMessageIndex >= 0 && prev[lastMessageIndex].role === 'ai') {
          // If the last message is AI, append the token to its content
          const updatedMessages = [...prev];
          updatedMessages[lastMessageIndex] = {
            ...updatedMessages[lastMessageIndex],
            content: updatedMessages[lastMessageIndex].content + data.token
          };
          return updatedMessages;
        } else {
          // Otherwise, create a new AI message with this token
          return [...prev, { role: 'ai', content: data.token }];
        }
      });
    });

    // Listener for the final classification JSON
    socketRef.current.on('chat_classification_final', (data) => {
      if (data.isEmergencyDispatched) {
        setPredictedDisease(data.disease);
        setImmediateActions(data.immediate_actions);
        setAssignedHospitalName(data.hospitalName);
        setSeverity('CRITICAL');
        // Final screen for critical emergencies
        setTimeout(() => setIsDispatched(true), 1500);
      } else {
        // NEW: Handle non-critical cases for Solve Problem 2
        setPredictedDisease(data.disease);
        setImmediateActions(data.immediate_actions || []);
        setSeverity('NON_CRITICAL');
        // No extra screen needed, user advice is already streamed in chat.
        // The chat UI can render non-critical advice differently if needed.
      }
    });

    return () => socketRef.current.disconnect();
  }, [user?._id]);

  const sendMessage = async (text, language) => {
    if (!text.trim()) return;

    setInputValue('');
    const currentHistory = [...messages];
    // Display user message instantly
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    
    // NEW: We are no longer waiting for the full response. 
    // Just create a placeholder for the streamed AI message.
    // setIsLoading(true); is no longer used for perception here.

    try {
      // Step 2: NEW: Use a different function for streaming chat or just post 
      // The socket handle 'stream_token' will handle the data flow
      //sendChatMessageApi(user._id, text, currentHistory, location, language);
      
      // Since sendChatMessageApi doesn't return data for streaming, we handle isLoading differently
      // The socket will start token flow instantly.
      
      // Call the API without awaiting for perception
      sendChatMessageApi(user._id, text, currentHistory, location, language)
        .catch(error => {
          toast.error('Connection lost. Please try again.');
          setMessages(currentHistory);
        });

    } catch (error) {
      toast.error('Connection lost. Please try again.');
      setMessages(currentHistory);
    } finally {
      // setIsLoading is not used here as it's not perception based anymore
    }
  };

  return {
    messages, inputValue, setInputValue, isLoading, sendMessage, 
    messagesEndRef, isDispatched, predictedDisease, immediateActions,
    assignedHospitalName, severity // Export severity so UI can show non-critical advice screen
  };
};