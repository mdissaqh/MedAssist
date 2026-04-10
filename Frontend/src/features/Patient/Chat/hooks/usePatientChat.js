import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { sendChatMessageApi } from '../api/chatApi';
import toast from 'react-hot-toast';

export const usePatientChat = () => {
  const { user } = useSelector((state) => state.auth); // Get logged-in patient ID
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hello. I am MedAssist AI. Please describe your emergency or click a symptom below.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [isDispatched, setIsDispatched] = useState(false); // Triggers the Ambulance Animation
  const [predictedDisease, setPredictedDisease] = useState('');

  const messagesEndRef = useRef(null);

  // 1. Get Location on Mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => toast.error("Please allow location access for faster ambulance dispatch.")
      );
    }
  }, []);

  // 2. Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // 3. Send Message Function
  const sendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = text;
    setInputValue(''); // Clear input
    
    // Add user message to UI optimistically
    const currentHistory = [...messages];
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const data = await sendChatMessageApi(user._id, userMessage, currentHistory, location);
      
      // Add AI response to UI
      setMessages((prev) => [...prev, { role: 'ai', content: data.reply }]);

      // Check if backend flagged this as CRITICAL
      if (data.isEmergencyDispatched) {
        setPredictedDisease(data.disease);
        setTimeout(() => setIsDispatched(true), 1500); // 1.5s delay for dramatic effect
      }

    } catch (error) {
      toast.error('Connection lost. Please try again.');
      // Remove the optimistic message if it failed
      setMessages(currentHistory);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    sendMessage,
    messagesEndRef,
    isDispatched,
    predictedDisease
  };
};