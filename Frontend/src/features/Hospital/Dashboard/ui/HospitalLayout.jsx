import React, { useState } from 'react';
import { Users, Activity, LogOut } from 'lucide-react';

// Import your two existing components!
import HospitalDashboard from './HospitalDashboard.jsx'; // This is your Patient/Socket page
import HospitalResources from './HospitalResources.jsx'; // This is your Ambulances/Disease toggles page

const HospitalLayout = () => {
  // This state is the magic! It tracks which menu item is clicked.
  const [activeView, setActiveView] = useState('patients'); 

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
      
      {/* ================= SIDEBAR ================= */}
      <div style={{ width: '260px', backgroundColor: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 10px rgba(0,0,0,0.1)', zIndex: 10 }}>
        
        <div style={{ padding: '25px 20px', borderBottom: '1px solid #334155' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🏥 MedAssist
          </h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Hospital Control Center</p>
        </div>
        
        <div style={{ flex: 1, padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          
          {/* PATIENT MANAGEMENT BUTTON */}
          <button 
            onClick={() => setActiveView('patients')}
            style={{ 
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', 
              background: activeView === 'patients' ? '#3b82f6' : 'transparent', // Turns blue if active
              color: activeView === 'patients' ? 'white' : '#cbd5e1', 
              border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '1.05rem', fontWeight: activeView === 'patients' ? 'bold' : 'normal', transition: '0.2s'
            }}
          >
            <Users size={22} /> Patient Management
          </button>
          
          {/* RESOURCE MANAGEMENT BUTTON */}
          <button 
            onClick={() => setActiveView('resources')}
            style={{ 
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', 
              background: activeView === 'resources' ? '#3b82f6' : 'transparent', // Turns blue if active
              color: activeView === 'resources' ? 'white' : '#cbd5e1', 
              border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '1.05rem', fontWeight: activeView === 'resources' ? 'bold' : 'normal', transition: '0.2s'
            }}
          >
            <Activity size={22} /> Resource Management
          </button>

        </div>

        {/* LOGOUT BUTTON */}
        <div style={{ padding: '20px' }}>
          <button style={{ 
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
            padding: '12px', background: 'transparent', color: '#ef4444', border: '2px solid #ef4444', 
            borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: '0.2s'
          }}>
            <LogOut size={20} /> System Logout
          </button>
        </div>
      </div>

      {/* ================= MAIN CONTENT AREA ================= */}
      {/* This is where the pages swap instantly without reloading the URL! */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {activeView === 'patients' ? <HospitalDashboard /> : <HospitalResources />}
      </div>

    </div>
  );
};

export default HospitalLayout;