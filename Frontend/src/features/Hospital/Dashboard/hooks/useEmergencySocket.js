import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axiosInstance from '../../../../api/axiosInstance';
import toast from 'react-hot-toast';

const SOCKET_SERVER_URL = 'https://medassist-ufl5.onrender.com'; 

// NEW: Accept hospitalId as a parameter
export const useEmergencySocket = (hospitalId) => {
  const [emergencies, setEmergencies] = useState([]);

  // Fetch from DB on load
  useEffect(() => {
    const fetchExistingEmergencies = async () => {
      try {
        const response = await axiosInstance.get('api/hospital/emergencies');
        setEmergencies(response.data);
      } catch (error) {
        console.error("Failed to load existing emergencies");
      }
    };
    fetchExistingEmergencies();
  }, []);

  // Listen for Live Updates
  useEffect(() => {
    // Prevent connecting if we don't have the hospital ID yet
    if (!hospitalId) return;

    const socket = io(SOCKET_SERVER_URL);

    // NEW: Tell the backend to join this specific hospital's room!
    socket.emit('join_hospital_room', hospitalId);

    socket.on('new_emergency', (newRequest) => {
      // 1. PLAY THE ALARM SOUND
      try {
        const alarm = new Audio('/alarm.mp3'); 
        alarm.play().catch((err) => console.log("Browser blocked auto-play. User must interact with the page first.", err));
      } catch (e) {
        console.error("Audio error", e);
      }

      toast.error(`🚨 NEW CRITICAL PATIENT: ${newRequest.predictedDisease}`, { duration: 6000 });
      setEmergencies((prev) => [newRequest, ...prev]);
    });

    return () => socket.disconnect();
  }, [hospitalId]); // Re-run if hospitalId changes

  // 2. PERMANENTLY RESOLVE THE PATIENT
  const markAsArrived = async (id) => {
    try {
      await axiosInstance.put(`api/hospital/emergencies/${id}/resolve`);
      setEmergencies((prev) => prev.filter(req => req.id !== id));
      toast.success("Patient arrival confirmed. Emergency closed.");
    } catch (error) {
      toast.error("Failed to update status in database.");
    }
  };

  return { emergencies, markAsArrived };
};