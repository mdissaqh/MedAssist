import axiosInstance from '../../../../api/axiosInstance'; // Import our new secure instance

// Notice we only need the relative path now, because baseURL is set!
export const addHospitalApi = async (hospitalData) => {
  const response = await axiosInstance.post('/admin/hospitals', hospitalData);
  return response.data;
};

export const editHospitalApi = async (id, hospitalData) => {
  const response = await axiosInstance.put(`/admin/hospitals/${id}`, hospitalData);
  return response.data;
};

export const searchHospitalsApi = async (query) => {
  const response = await axiosInstance.get(`/admin/hospitals/search?query=${query}`);
  return response.data;
};