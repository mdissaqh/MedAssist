import axiosInstance from '../../../../api/axiosInstance';

// Fetch current data
export const getHospitalProfileApi = async () => {
  const response = await axiosInstance.get('/api/hospital/profile');
  return response.data;
};

// Update data
export const updateHospitalResourcesApi = async (resourceData) => {
  const response = await axiosInstance.put('/api/hospital/resources', resourceData);
  return response.data;
};
