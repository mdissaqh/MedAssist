import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { sendChatMessageApi } from '../api/chatApi';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client'; // MAKE SURE THIS IS IMPORTED!

// Your Render Backend URL
const SOCKET_SERVER_URL = 'https://medassist-ufl5.onrender.com';

const GREETINGS = {
  'English': 'Hello. I am MedAssist AI. Please click a symptom below or describe your emergency.',
  'Hindi': 'नमस्ते। मैं मेडअसिस्ट एआई हूं। कृपया नीचे एक लक्षण पर क्लिक करें या अपनी आपात स्थिति का वर्णन करें।',
  'Kannada': 'ನಮಸ್ಕಾರ. ನಾನು ಮೆಡ್‌ಅಸಿಸ್ಟ್ ಎಐ. ದಯವಿಟ್ಟು ಕೆಳಗಿನ ರೋಗಲಕ್ಷಣವನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ ಅಥವಾ ನಿಮ್ಮ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯನ್ನು ವಿವರಿಸಿ.',
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

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null); // NEW: Reference for the socket connection

  // 1. GREETING
  useEffect(() => {
    setMessages([{ role: 'ai', content: GREETINGS[selectedLanguage] }]);
  }, [selectedLanguage]);

  // 2. GEOLOCATION
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => toast.error("Please allow location access.")
      );
    }
  }, []);

  // 3. AUTO SCROLL
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // 4. SOCKET LISTENER FOR STREAMING
  useEffect(() => {
    if (!user?._id) return;

    socketRef.current = io(SOCKET_SERVER_URL);
    socketRef.current.emit('join_hospital_room', user._id);

    socketRef.current.on('stream_token', (data) => {
      if (data.token) setIsLoading(false); // Turn off loading dots instantly when text arrives
      
      setMessages((prev) => {
        const lastMessageIndex = prev.length - 1;
        // Append token to the existing AI placeholder message
        if (lastMessageIndex >= 0 && prev[lastMessageIndex].role === 'ai') {
          const updatedMessages = [...prev];
          updatedMessages[lastMessageIndex] = {
            ...updatedMessages[lastMessageIndex],
            content: updatedMessages[lastMessageIndex].content + data.token
          };
          return updatedMessages;
        } else {
          return [...prev, { role: 'ai', content: data.token }];
        }
      });
    });

    return () => socketRef.current.disconnect();
  }, [user?._id]);

  // 5. SEND MESSAGE (Updated for Streaming & Placeholders)
  const sendMessage = async (text, language) => {
    if (!text.trim()) return;

    setInputValue('');
    const currentHistory = [...messages];
    
    // Create an empty AI message placeholder so the socket can start typing into it
    setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'ai', content: '' }]);
    setIsLoading(true);

    try {
      // Wait for the backend to finish the stream and database updates
      const data = await sendChatMessageApi(user._id, text, currentHistory, location, language);
      
      // Replace the streamed text with the final clean markdown text just to be safe
      setMessages((prev) => {
         const newMessages = [...prev];
         newMessages[newMessages.length - 1] = { role: 'ai', content: data.reply };
         return newMessages;
      });

      if (data.isEmergencyDispatched) {
        setPredictedDisease(data.disease);
        setImmediateActions(data.immediate_actions); // Will now be 4 points!
        setAssignedHospitalName(data.hospitalName); 
        setTimeout(() => setIsDispatched(true), 1500);
      }
    } catch (error) {
      toast.error('Connection lost. Please try again.');
      setMessages(currentHistory); // Revert on failure
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages, inputValue, setInputValue, isLoading, sendMessage, 
    messagesEndRef, isDispatched, predictedDisease, immediateActions,
    assignedHospitalName
  };
};