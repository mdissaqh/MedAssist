import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginSuccess } from '../../../../store/authSlice';
import { loginAdminApi } from '../api/adminLoginApi';

export const useAdminLogin = () => {
  const [adminId, setAdminId] = useState('');
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
      const data = await loginAdminApi(adminId, password);
      
      // Save session in Redux
      dispatch(loginSuccess({
        user: { _id: data._id, adminId: data.adminId },
        token: data.token,
        role: 'admin'
      }));

      // Redirect to Admin dashboard
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return { adminId, setAdminId, password, setPassword, handleLogin, loading, error };
};