import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Custom Icons ---
const createIcon = (emoji, size = 30) => L.divIcon({
  html: `<div style="font-size: ${size}px; line-height: 1; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.4));">${emoji}</div>`,
  className: 'custom-emoji-icon',
  iconSize: [size, size],
  iconAnchor: [size/2, size],
});

const hospitalIcon = createIcon('🏥');
const patientIcon = createIcon('📍');
const ambulanceIcon = createIcon('🚑', 35);

const LiveAmbulanceMap = ({ hospitalName, patientLat, patientLng }) => {
  const pLat = patientLat || 12.9352; 
  const pLng = patientLng || 77.6245;
  const hLat = 12.9716; 
  const hLng = 77.5946;

  const [baseRoute, setBaseRoute] = useState([]);
  const [trafficRoute, setTrafficRoute] = useState([]); 
  const [detourRoute, setDetourRoute] = useState([]);   
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tripPhase, setTripPhase] = useState('INITIAL'); 

  const routeFetchedRef = useRef(false);
  const trafficCenterRef = useRef(null);
  const stepTimeMs = 400; // 0.4 seconds per movement

  // 1. Fetch INITIAL Route
  useEffect(() => {
    if (routeFetchedRef.current) return;

    const fetchInitialRoute = async () => {
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${hLng},${hLat};${pLng},${pLat}?overview=full&geometries=geojson`);
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setBaseRoute(coords);
          
          // Traffic Zone (30% to 60%)
          const startTrafficIdx = Math.floor(coords.length * 0.30);
          const endTrafficIdx = Math.floor(coords.length * 0.60);
          const redSegment = coords.slice(startTrafficIdx, endTrafficIdx);
          
          setTrafficRoute(redSegment);
          trafficCenterRef.current = redSegment[Math.floor(redSegment.length / 2)];
          
          routeFetchedRef.current = true;
        }
      } catch (error) {
        console.error("Failed to fetch route", error);
      }
    };
    fetchInitialRoute();
  }, [pLat, pLng, hLat, hLng]);

  // 2. The Master Animation Logic
  useEffect(() => {
    if (baseRoute.length === 0 || tripPhase === 'REROUTING' || tripPhase === 'AT_PATIENT' || tripPhase === 'ARRIVED') return;

    const triggerIndex = Math.floor(baseRoute.length * 0.25);

    const moveTimer = setInterval(() => {
      setCurrentIndex((prev) => {
        // --- PHASE 1: Moving to Patient ---
        if (tripPhase === 'INITIAL') {
          if (prev + 1 === triggerIndex) {
            clearInterval(moveTimer);
            handleReroute(baseRoute[prev]); 
            return prev;
          }
          return prev + 1;
        }

        // --- PHASE 2: Taking the Detour ---
        if (tripPhase === 'DETOUR') {
          if (prev + 1 >= detourRoute.length - 1) {
            clearInterval(moveTimer);
            handlePatientPickup();
            return detourRoute.length - 1;
          }
          return prev + 1;
        }

        // --- PHASE 3: Returning to Hospital (Traffic is cleared!) ---
        if (tripPhase === 'RETURNING') {
          if (prev - 1 <= 0) {
            clearInterval(moveTimer);
            setTripPhase('ARRIVED');
            return 0;
          }
          return prev - 1; // Moving BACKWARDS through the base array
        }

        return prev;
      });
    }, stepTimeMs);

    return () => clearInterval(moveTimer);
  }, [baseRoute, detourRoute, tripPhase]);

  // 3. FIXED Rerouting Function
  const handleReroute = async (currentAmbulanceLocation) => {
    setTripPhase('REROUTING');
    try {
      const [cLat, cLng] = currentAmbulanceLocation;
      const [tLat, tLng] = trafficCenterRef.current;
      const detourLat = tLat;
      const detourLng = tLng + 0.015; 

      // FIXED TYPO HERE: router.project-osrm.org
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${cLng},${cLat};${detourLng},${detourLat};${pLng},${pLat}?overview=full&geometries=geojson`);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const newCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        setTimeout(() => {
          setDetourRoute(newCoords);
          setCurrentIndex(0); 
          setTripPhase('DETOUR');
        }, 1500);
      }
    } catch (error) {
      console.error("Reroute failed", error);
    }
  };

  // 4. Patient Pickup Logic
  const handlePatientPickup = () => {
    setTripPhase('AT_PATIENT');
    // Wait 3 seconds, then head back to hospital on the original road
    setTimeout(() => {
      setTripPhase('RETURNING');
      setCurrentIndex(baseRoute.length - 1); // Start at the end of the original blue route
    }, 3000);
  };

  // 5. Perfect ETA Math
  const calculateDynamicETA = () => {
    let remainingSteps = 0;
    
    // Safety check so it doesn't show 0 while loading
    if (tripPhase === 'INITIAL' && baseRoute.length > 0) {
      remainingSteps = baseRoute.length - currentIndex; 
    } else if (tripPhase === 'REROUTING') {
      remainingSteps = (baseRoute.length - currentIndex) + 10; // Pause penalty
    } else if (tripPhase === 'DETOUR' && detourRoute.length > 0) {
      remainingSteps = detourRoute.length - currentIndex;
    } else if (tripPhase === 'RETURNING') {
      remainingSteps = currentIndex; 
    }

    return Math.ceil(remainingSteps * (stepTimeMs / 1000));
  };

  const formatETA = (seconds) => {
    if (tripPhase === 'REROUTING') return "Calculating...";
    if (tripPhase === 'AT_PATIENT') return "Loading...";
    if (tripPhase === 'ARRIVED') return "Complete";
    if (seconds <= 0) return "Arriving...";
    
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getStatusBanner = () => {
    if (tripPhase === 'INITIAL') return { text: "🚑 Ambulance Dispatched", color: '#2563eb', bg: '#eff6ff' };
    if (tripPhase === 'REROUTING') return { text: "🛑 TRAFFIC: Calculating detour...", color: '#dc2626', bg: '#fef2f2', pulse: true };
    if (tripPhase === 'DETOUR') return { text: "✅ Rerouted. Taking clear path.", color: '#166534', bg: '#f0fdf4' };
    if (tripPhase === 'AT_PATIENT') return { text: "📍 Arrived. Securing Patient.", color: '#eab308', bg: '#fefce8' };
    if (tripPhase === 'RETURNING') return { text: "🏥 Traffic Cleared! Returning to Hospital.", color: '#0284c7', bg: '#f0f9ff' };
    return { text: "✅ Safely arrived at Hospital", color: '#166534', bg: '#f0fdf4' };
  };

  const status = getStatusBanner();
  
  // Get active ambulance position
  let activeArray = baseRoute;
  if (tripPhase === 'DETOUR') activeArray = detourRoute;
  const currentAmbulancePos = activeArray[currentIndex] || [hLat, hLng];

  return (
    <div style={{ marginTop: '20px', borderRadius: '12px', overflow: 'hidden', border: `4px solid ${status.color}`, position: 'relative', transition: 'all 0.3s' }}>
      
      <div style={{ 
        position: 'absolute', top: '10px', left: '10px', right: '10px', zIndex: 1000, 
        background: status.bg, padding: '12px 20px', borderRadius: '8px', 
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', 
        alignItems: 'center', border: `2px solid ${status.color}`,
        animation: status.pulse ? 'pulse 1s infinite' : 'none'
      }}>
        <h4 style={{ margin: 0, fontSize: '1rem', color: status.color, fontWeight: 'bold' }}>{status.text}</h4>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Live ETA</span>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: status.color }}>{formatETA(calculateDynamicETA())}</h2>
        </div>
      </div>

      <MapContainer center={[12.95, 77.61]} zoom={13} style={{ height: '400px', width: '100%' }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        
        {/* The Base Route (Blue) */}
        {baseRoute.length > 0 && (
          <Polyline positions={baseRoute} color="#3b82f6" weight={6} opacity={(tripPhase === 'DETOUR' || tripPhase === 'AT_PATIENT') ? 0.3 : 0.8} />
        )}

        {/* The Traffic Jam (Red) - Disappears once patient is picked up! */}
        {trafficRoute.length > 0 && (tripPhase === 'INITIAL' || tripPhase === 'REROUTING' || tripPhase === 'DETOUR' || tripPhase === 'AT_PATIENT') && (
          <Polyline positions={trafficRoute} color="#ef4444" weight={7} opacity={0.9} />
        )}

        {/* The Detour (Green) */}
        {detourRoute.length > 0 && (tripPhase === 'DETOUR' || tripPhase === 'AT_PATIENT') && (
          <Polyline positions={detourRoute} color="#22c55e" weight={6} opacity={0.9} />
        )}

        <Marker position={[hLat, hLng]} icon={hospitalIcon} />
        <Marker position={[pLat, pLng]} icon={patientIcon} />
        <Marker position={currentAmbulancePos} icon={ambulanceIcon} />
      </MapContainer>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
      `}</style>
    </div>
  );
};

export default LiveAmbulanceMap;