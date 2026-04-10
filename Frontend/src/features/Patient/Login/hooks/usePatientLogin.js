import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginSuccess } from '../../../../store/authSlice';
import { loginPatientApi } from '../api/patientLoginApi';

export const usePatientLogin = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await loginPatientApi(mobileNumber);
      
      // Dispatch to global Redux store
      dispatch(loginSuccess({
        user: { _id: data._id, mobileNumber: data.mobileNumber },
        token: data.token,
        role: 'patient'
      }));

      // Redirect to patient chat/dashboard (we will build this later)
      navigate('/patient/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return {
    mobileNumber,
    setMobileNumber,
    handleLogin,
    loading,
    error
  };
};