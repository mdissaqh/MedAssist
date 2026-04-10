import axios from 'axios';

// Base URL for our backend
const API_URL = 'http://localhost:5000/api/auth';

export const loginPatientApi = async (mobileNumber) => {
  const response = await axios.post(`${API_URL}/patient/login`, { mobileNumber });
  return response.data;
};