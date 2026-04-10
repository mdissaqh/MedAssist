import axiosInstance from '../../../../api/axiosInstance';

export const updateHospitalResourcesApi = async (resourceData) => {
  const response = await axiosInstance.put('/hospital/resources', resourceData);
  return response.data;
};