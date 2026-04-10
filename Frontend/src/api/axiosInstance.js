import axios from 'axios';


// Create a custom instance
const axiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:5000/api',
});

// Intercept requests and add the token before they leave the frontend
axiosInstance.interceptors.request.use(
  (config) => {
    // Grab token from local storage (saved by our Redux authSlice)
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;