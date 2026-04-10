import axiosInstance from '../../../../api/axiosInstance';

export const sendChatMessageApi = async (patientId, message, history, location) => {
  const response = await axiosInstance.post('/ai/chat', {
    patientId,
    message,
    history,
    location
  });
  return response.data;
};