import axiosInstance from '../../../../api/axiosInstance';

export const sendChatMessageApi = async (patientId, message, history, location, language) => {
  const response = await axiosInstance.post('api/ai/chat', {
    patientId, message, history, location, language // Pass language here!
  });
  return response.data;
};
