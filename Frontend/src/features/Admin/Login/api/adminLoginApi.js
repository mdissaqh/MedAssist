import axios from 'axios';

const API_URL = 'https://medassist-ufl5.onrender.com/api/auth';

export const loginAdminApi = async (adminId, password) => {
  const response = await axios.post(`${API_URL}/admin/login`, { adminId, password });
  return response.data;
};