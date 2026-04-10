import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginSuccess } from '../../../../store/authSlice';
import { loginHospitalApi } from '../api/hospitalLoginApi';

export const useHospitalLogin = () => {
  const [hospitalId, setHospitalId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await loginHospitalApi(hospitalId, password);
      
      dispatch(loginSuccess({
        user: { _id: data._id, hospitalId: data.hospitalId, name: data.name },
        token: data.token,
        role: 'hospital'
      }));

      navigate('/hospital/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Invalid ID or password.');
    } finally {
      setLoading(false);
    }
  };

  return { hospitalId, setHospitalId, password, setPassword, handleLogin, loading, error };
};