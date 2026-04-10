import { useState } from 'react';
import toast from 'react-hot-toast';
import { addHospitalApi } from '../api/hospitalApi';

export const useHospitalForm = () => {
  const [formData, setFormData] = useState({
    hospitalId: '',
    password: '',
    name: '',
    facilities: '', // We will split this by commas before sending
    availableAmbulances: 0,
  });
  
  const [location, setLocation] = useState(null); // { lat, lng }
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) {
      toast.error("Please pin the location on the map!");
      return;
    }

    setLoading(true);
    try {
      // Convert comma-separated string to an array
      const facilitiesArray = formData.facilities.split(',').map(f => f.trim());
      
      const payload = {
        ...formData,
        facilities: facilitiesArray,
        lat: location.lat,
        lng: location.lng
      };

      await addHospitalApi(payload);
      toast.success('Hospital Added Successfully!');
      
      // Reset form
      setFormData({ hospitalId: '', password: '', name: '', facilities: '', availableAmbulances: 0 });
      setLocation(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add hospital.');
    } finally {
      setLoading(false);
    }
  };

  return { formData, handleChange, location, setLocation, handleSubmit, loading };
};