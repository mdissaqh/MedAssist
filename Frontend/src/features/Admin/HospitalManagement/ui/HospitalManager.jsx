import React, { useState } from 'react';
import { useHospitalForm } from '../hooks/useHospitalForm';
import { searchHospitalsApi } from '../api/hospitalApi';
import MapPicker from './MapPicker';
import { Building2, MapPin, Search } from 'lucide-react';
import './HospitalManager.scss';

const HospitalManager = () => {
  const [activeTab, setActiveTab] = useState('add'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const { 
    formData, handleChange, location, setLocation, handleSubmit, 
    loading, selectedSpecialties, toggleSpecialty, MAJOR_DISEASES 
  } = useHospitalForm(); // (Make sure you removed formData.facilities from the hook!)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await searchHospitalsApi(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed", error);
    }
  };

  return (
    <div className="hospital-manager-container">
      <div className="manager-card">
        <div className="header">
          <Building2 size={28} color="#1565c0" />
          <h2>Admin Dashboard</h2>
        </div>

        <div className="tabs" style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
          <button onClick={() => setActiveTab('add')} style={{ fontWeight: activeTab === 'add' ? 'bold' : 'normal' }}>Register</button>
          <button onClick={() => setActiveTab('search')} style={{ fontWeight: activeTab === 'search' ? 'bold' : 'normal' }}>Search</button>
        </div>

        {activeTab === 'add' && (
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <input type="text" name="hospitalId" placeholder="Hospital ID" value={formData.hospitalId} onChange={handleChange} required />
              <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
              <input type="text" name="name" placeholder="Full Hospital Name" value={formData.name} onChange={handleChange} required />
              {/* Removed general facilities input */}
            </div>

            <div className="specialties-section" style={{ marginTop: '1rem' }}>
              <h4>Assign Major Disease Specialties</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {MAJOR_DISEASES.map(disease => (
                  <label key={disease}>
                    <input type="checkbox" checked={selectedSpecialties.includes(disease)} onChange={() => toggleSpecialty(disease)} />
                    {' '}{disease}
                  </label>
                ))}
              </div>
            </div>

            <div className="map-section"><MapPicker location={location} setLocation={setLocation} /></div>
            <button type="submit" disabled={loading} className="submit-btn">Add Hospital</button>
          </form>
        )}

        {activeTab === 'search' && (
          <div className="search-section">
             <div style={{display: 'flex', gap: '10px'}}>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by ID or Name..." style={{flex: 1, padding: '10px'}}/>
                <button onClick={handleSearch} style={{padding: '10px'}}><Search size={18}/></button>
             </div>
             
             {/* Search Results Display */}
             <div style={{ marginTop: '1rem' }}>
               {searchResults.map(hosp => (
                 <div key={hosp._id} style={{ padding: '10px', border: '1px solid #ccc', marginBottom: '10px', borderRadius: '6px' }}>
                   <strong>{hosp.name}</strong> ({hosp.hospitalId})
                   <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>Specialties: {hosp.specialties.map(s => s.disease).join(', ')}</p>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HospitalManager;