import { useState } from 'react';
import toast from 'react-hot-toast';
import { addHospitalApi } from '../api/hospitalApi';

const MAJOR_DISEASES = [
  'Heart Attack', 'Stroke', 'Cardiac Arrest', 'Severe Asthma Attack', 
  'Severe External Bleeding', 'Brain Hemorrhage', 'Seizure', 'Snake Bite'
];

export const useHospitalForm = () => {
  const [formData, setFormData] = useState({
    hospitalId: '', password: '', name: '', facilities: ''
  });
  // Admin assigns specialties, but NOT ambulance count
  const [selectedSpecialties, setSelectedSpecialties] = useState([]); 
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const toggleSpecialty = (disease) => {
    setSelectedSpecialties(prev => 
      prev.includes(disease) ? prev.filter(d => d !== disease) : [...prev, disease]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) return toast.error("Please pin the location on the map!");
    if (selectedSpecialties.length === 0) return toast.error("Select at least one major disease specialty.");

    setLoading(true);
    try {
      // Format the specialties array for the backend schema
      const formattedSpecialties = selectedSpecialties.map(disease => ({
        disease,
        isAvailable: true // Default to true, Hospital turns it off later if full
      }));

      const payload = {
        ...formData,
        facilities: formData.facilities.split(',').map(f => f.trim()),
        specialties: formattedSpecialties,
        lat: location.lat,
        lng: location.lng
      };

      await addHospitalApi(payload);
      toast.success('Hospital Registered Successfully!');
      setFormData({ hospitalId: '', password: '', name: '', facilities: '' });
      setSelectedSpecialties([]);
      setLocation(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add hospital.');
    } finally {
      setLoading(false);
    }
  };

  return { 
    formData, handleChange, location, setLocation, handleSubmit, 
    loading, selectedSpecialties, toggleSpecialty, MAJOR_DISEASES 
  };
};