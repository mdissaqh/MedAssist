import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

export const useEmergencySocket = () => {
  const [emergencies, setEmergencies] = useState([]);
  const audioRef = useRef(null);

  useEffect(() => {
    // Initialize the audio object pointing to the public folder
    audioRef.current = new Audio('/alarm.mp3');

    // Connect to Backend WebSocket
    const socket = io('http://127.0.0.1:5000');

    socket.on('connect', () => {
      console.log('Connected to MedAssist Emergency Network');
    });

    // LISTEN FOR EMERGENCIES!
    socket.on('new_emergency', (emergencyData) => {
      // 1. Play the siren sound
      audioRef.current.play().catch(e => console.log("Browser blocked autoplay. User must click first.", e));
      
      // 2. Show a red toast popup
      toast.error(`🚨 CODE RED: ${emergencyData.predictedDisease}!`, {
        duration: 8000,
        style: { background: '#d32f2f', color: '#fff', fontWeight: 'bold' }
      });

      // 3. Add to the top of our list
      setEmergencies((prev) => [emergencyData, ...prev]);
    });

    // Cleanup on unmount
    return () => socket.disconnect();
  }, []);

  // Function to mark a patient as arrived
  const markAsArrived = (id) => {
    setEmergencies(prev => prev.filter(req => req.id !== id));
    toast.success("Patient arrival confirmed. Ambulance freed!");
    // In the future, we will make an API call here to update the DB & free up the ambulance.
  };

  return { emergencies, markAsArrived };
};