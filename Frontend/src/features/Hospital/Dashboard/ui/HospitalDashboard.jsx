import React from 'react';
import { useEmergencySocket } from '../hooks/useEmergencySocket';
import { AlertTriangle, Clock, MapPin, Phone, Activity } from 'lucide-react';
import './HospitalDashboard.scss';

const HospitalDashboard = () => {
  const { emergencies, markAsArrived } = useEmergencySocket();

  return (
    <div className="hospital-dashboard" style={{ padding: '0' }}>
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Live Patient Emergencies</h2>
        <div style={{ background: '#dcfce7', color: '#166534', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold' }}>System Active</div>
      </header>

      {emergencies.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '4rem 0', fontSize: '1.2rem' }}>
          No active patient requests. Waiting for dispatch...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {emergencies.map((req) => (
            <div key={req.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', borderLeft: '6px solid #d32f2f', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                <h3 style={{ color: '#d32f2f', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={20}/> {req.predictedDisease}</h3>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: '5px 0' }}><strong><Phone size={14}/> Mobile:</strong> {req.patientMobile}</p>
                <p style={{ margin: '5px 0' }}><strong><MapPin size={14}/> Location:</strong> {req.address}</p>
                <div style={{ background: '#f8fafc', padding: '10px', marginTop: '10px', borderRadius: '5px' }}>
                  <strong><Activity size={14}/> Patient Stated Issue:</strong> <br/>
                  {req.symptoms}
                </div>
              </div>

              <button 
                onClick={() => markAsArrived(req.id)}
                style={{ width: '100%', padding: '10px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Confirm Patient Arrived
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HospitalDashboard;