import React from 'react';
import { useHospitalForm } from '../hooks/useHospitalForm';
import MapPicker from './MapPicker';
import { Building2, MapPin } from 'lucide-react';
import './HospitalManager.scss';

const HospitalManager = () => {
  const { formData, handleChange, location, setLocation, handleSubmit, loading } = useHospitalForm();

  return (
    <div className="hospital-manager-container">
      <div className="manager-card">
        <div className="header">
          <Building2 size={28} color="#1565c0" />
          <h2>Onboard New Hospital</h2>
        </div>
        <p>Register an official hospital to the MedAssist network.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <input type="text" name="hospitalId" placeholder="Hospital ID (e.g., HOSP_002)" value={formData.hospitalId} onChange={handleChange} required />
            <input type="password" name="password" placeholder="Secure Password" value={formData.password} onChange={handleChange} required />
            <input type="text" name="name" placeholder="Full Hospital Name" value={formData.name} onChange={handleChange} required />
            <input type="number" name="availableAmbulances" placeholder="Available Ambulances" value={formData.availableAmbulances} onChange={handleChange} required min="0" />
          </div>
          
          <input type="text" name="facilities" placeholder="Facilities (e.g., ICU, Trauma, X-Ray)" value={formData.facilities} onChange={handleChange} required className="full-width" />

          <div className="map-section">
            <h4><MapPin size={18} /> Location Pinning</h4>
            <MapPicker location={location} setLocation={setLocation} />
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Registering...' : 'Add Hospital to Network'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default HospitalManager;