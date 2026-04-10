import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';

export const loginAdminApi = async (adminId, password) => {
  const response = await axios.post(`${API_URL}/admin/login`, { adminId, password });
  return response.data;
};