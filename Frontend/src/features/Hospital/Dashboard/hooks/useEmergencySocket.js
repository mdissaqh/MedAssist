import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axiosInstance from '../../../../api/axiosInstance';
import toast from 'react-hot-toast';

const SOCKET_SERVER_URL = 'http://localhost:5000'; 

export const useEmergencySocket = () => {
  const [emergencies, setEmergencies] = useState([]);

  // Fetch from DB on load
  useEffect(() => {
    const fetchExistingEmergencies = async () => {
      try {
        const response = await axiosInstance.get('/hospital/emergencies');
        setEmergencies(response.data);
      } catch (error) {
        console.error("Failed to load existing emergencies");
      }
    };
    fetchExistingEmergencies();
  }, []);

  // Listen for Live Updates
  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL);

    socket.on('new_emergency', (newRequest) => {
      // 1. PLAY THE ALARM SOUND
      try {
        // This looks inside your Frontend/public folder for alarm.mp3
        const alarm = new Audio('/alarm.mp3'); 
        alarm.play().catch((err) => console.log("Browser blocked auto-play. User must interact with the page first.", err));
      } catch (e) {
        console.error("Audio error", e);
      }

      toast.error(`🚨 NEW CRITICAL PATIENT: ${newRequest.predictedDisease}`, { duration: 6000 });
      setEmergencies((prev) => [newRequest, ...prev]);
    });

    return () => socket.disconnect();
  }, []);

  // 2. PERMANENTLY RESOLVE THE PATIENT
  const markAsArrived = async (id) => {
    try {
      // Tell the backend to update the MongoDB status to 'RESOLVED'
      await axiosInstance.put(`/hospital/emergencies/${id}/resolve`);
      
      // Remove them from the screen
      setEmergencies((prev) => prev.filter(req => req.id !== id));
      toast.success("Patient arrival confirmed. Emergency closed.");
    } catch (error) {
      toast.error("Failed to update status in database.");
    }
  };

  return { emergencies, markAsArrived };
};