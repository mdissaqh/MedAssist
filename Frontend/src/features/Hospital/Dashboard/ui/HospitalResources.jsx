import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { updateHospitalResourcesApi } from '../api/hospitalResourcesApi';
import { Activity, Truck, CheckSquare, Square } from 'lucide-react';

const HospitalResources = ({ initialAmbulances = 0, initialSpecialties = [] }) => {
  const [ambulances, setAmbulances] = useState(initialAmbulances);
  const [specialties, setSpecialties] = useState(
    initialSpecialties.length > 0 ? initialSpecialties : [
      { disease: 'Heart Attack', isAvailable: true },
      { disease: 'Stroke', isAvailable: true },
      { disease: 'Cardiac Arrest', isAvailable: true },
      { disease: 'Severe Asthma Attack', isAvailable: true },
      { disease: 'Severe External Bleeding', isAvailable: true },
      { disease: 'Brain Hemorrhage', isAvailable: true },
      { disease: 'Seizure', isAvailable: true },
      { disease: 'Snake Bite', isAvailable: true }
    ]
  );
  const [loading, setLoading] = useState(false);

  const toggleAvailability = (diseaseName) => {
    setSpecialties(specialties.map(spec => 
      spec.disease === diseaseName ? { ...spec, isAvailable: !spec.isAvailable } : spec
    ));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateHospitalResourcesApi({ availableAmbulances: ambulances, specialties });
      toast.success("Resources Saved!");
    } catch (error) {
      toast.error("Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '0', maxWidth: '800px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Update Hospital Capacity</h2>

      <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        
        {/* Ambulance Control */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Truck color="#1565c0" /> Ambulances Ready for Dispatch</h3>
          <input 
            type="number" 
            min="0" 
            value={ambulances} 
            onChange={(e) => setAmbulances(Number(e.target.value))}
            style={{ padding: '15px', fontSize: '1.2rem', borderRadius: '8px', border: '2px solid #cbd5e1', width: '150px', outline: 'none' }}
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />

        {/* Disease Toggles */}
        <h3 style={{ marginBottom: '15px' }}>Turn OFF diseases if specialists/beds are full:</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          {specialties.map((spec) => (
            <button 
              key={spec.disease} 
              onClick={() => toggleAvailability(spec.disease)}
              style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                padding: '15px 20px', borderRadius: '8px', cursor: 'pointer',
                border: spec.isAvailable ? '2px solid #22c55e' : '2px solid #ef4444',
                background: spec.isAvailable ? '#f0fdf4' : '#fef2f2',
                color: '#0f172a', fontWeight: 'bold', fontSize: '1rem'
              }}
            >
              {spec.disease}
              {spec.isAvailable ? <CheckSquare color="#22c55e" /> : <Square color="#ef4444" />}
            </button>
          ))}
        </div>

        <button 
          onClick={handleSave} 
          disabled={loading}
          style={{ width: '100%', padding: '15px', background: '#1565c0', color: 'white', border: 'none', borderRadius: '8px', marginTop: '30px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {loading ? 'Saving...' : 'Confirm Live Capacity'}
        </button>
      </div>
    </div>
  );
};

export default HospitalResources;