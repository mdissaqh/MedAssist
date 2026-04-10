import React, { useState } from 'react';
import HospitalResources from './HospitalResources.jsx';
import EmergencyRequests from './HospitalDashboard.jsx'; // This is your Patient Page
import { Activity, Users, LogOut } from 'lucide-react';

const HospitalLayout = () => {
  const [activePage, setActivePage] = useState('patients'); 

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f1f5f9' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '250px', backgroundColor: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #334155' }}>
          <h2>🏥 MedAssist</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Hospital Portal</p>
        </div>
        
        <div style={{ flex: 1, padding: '20px 0' }}>
          <button 
            onClick={() => setActivePage('patients')}
            style={{ width: '100%', display: 'flex', gap: '10px', padding: '15px 20px', background: activePage === 'patients' ? '#3b82f6' : 'transparent', color: 'white', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '1rem' }}
          >
            <Users size={20} /> Active Patients
          </button>
          
          <button 
            onClick={() => setActivePage('resources')}
            style={{ width: '100%', display: 'flex', gap: '10px', padding: '15px 20px', background: activePage === 'resources' ? '#3b82f6' : 'transparent', color: 'white', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '1rem' }}
          >
            <Activity size={20} /> Resources
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA - Swaps based on state */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
        {activePage === 'patients' ? <EmergencyRequests /> : <HospitalResources />}
      </div>
    </div>
  );
};

export default HospitalLayout;