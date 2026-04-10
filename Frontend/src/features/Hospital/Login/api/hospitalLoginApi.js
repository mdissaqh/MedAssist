import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';

export const loginHospitalApi = async (hospitalId, password) => {
  const response = await axios.post(`${API_URL}/hospital/login`, { hospitalId, password });
  return response.data;
};