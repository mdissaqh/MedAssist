import React from 'react';
import { useEmergencySocket } from '../hooks/useEmergencySocket';
import { AlertTriangle, Clock, MapPin, Phone, Activity } from 'lucide-react';
import './HospitalDashboard.scss';

const HospitalDashboard = () => {
  const { emergencies, markAsArrived } = useEmergencySocket();

  return (
    <div className="hospital-dashboard">
      <header className="dashboard-header">
        <h2>Live Emergency Feed</h2>
        <div className="status-badge">
          <span className="pulse-dot"></span> System Active
        </div>
      </header>

      {emergencies.length === 0 ? (
        <div className="empty-state">
          <p>No active emergencies. Waiting for dispatch...</p>
        </div>
      ) : (
        <div className="emergency-grid">
          {emergencies.map((req) => (
            <div key={req.id} className="emergency-card">
              <div className="card-header">
                <h3><AlertTriangle size={24} color="#d32f2f" /> {req.predictedDisease}</h3>
                <span className="eta-badge"><Clock size={16} /> ETA: {req.eta}</span>
              </div>
              
              <div className="card-body">
                <p><Phone size={18} /> <strong>Mobile:</strong> {req.patientMobile}</p>
                <p><MapPin size={18} /> <strong>Location:</strong> {req.address}</p>
                <p className="symptoms"><Activity size={18} /> <strong>Reported Symptoms:</strong> {req.symptoms}</p>
              </div>

              <button className="arrive-btn" onClick={() => markAsArrived(req.id)}>
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