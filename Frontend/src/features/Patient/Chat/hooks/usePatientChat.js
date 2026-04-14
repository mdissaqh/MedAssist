import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { sendChatMessageApi } from '../api/chatApi';
import toast from 'react-hot-toast';

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
  
  // NEW: State to hold the assigned hospital's name
  const [assignedHospitalName, setAssignedHospitalName] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([{ role: 'ai', content: GREETINGS[selectedLanguage] }]);
  }, [selectedLanguage]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => toast.error("Please allow location access.")
      );
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text, language) => {
    if (!text.trim()) return;

    setInputValue('');
    const currentHistory = [...messages];
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);

    try {
      const data = await sendChatMessageApi(user._id, text, currentHistory, location, language);
      
      setMessages((prev) => [...prev, { role: 'ai', content: data.reply }]);

      if (data.isEmergencyDispatched) {
        setPredictedDisease(data.disease);
        setImmediateActions(data.immediate_actions);
        
        // NEW: Grab the hospital name from the backend and save it!
        setAssignedHospitalName(data.hospitalName); 
        
        setTimeout(() => setIsDispatched(true), 1500);
      }
    } catch (error) {
      toast.error('Connection lost. Please try again.');
      setMessages(currentHistory);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages, inputValue, setInputValue, isLoading, sendMessage, 
    messagesEndRef, isDispatched, predictedDisease, immediateActions,
    assignedHospitalName // NEW: Export it so the UI can use it!
  };
};