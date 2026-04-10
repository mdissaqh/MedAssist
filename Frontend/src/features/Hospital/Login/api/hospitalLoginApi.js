import axios from 'axios';

const API_URL = 'https://medassist-ufl5.onrender.com';

export const loginHospitalApi = async (hospitalId, password) => {
  const response = await axios.post(`${API_URL}/hospital/login`, { hospitalId, password });
  return response.data;
};