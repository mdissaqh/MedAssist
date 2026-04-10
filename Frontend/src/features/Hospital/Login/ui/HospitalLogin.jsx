import React from 'react';
import { useHospitalLogin } from '../hooks/useHospitalLogin';
import './HospitalLogin.scss';

const HospitalLogin = () => {
  const { hospitalId, setHospitalId, password, setPassword, handleLogin, loading, error } = useHospitalLogin();

  return (
    <div className="hospital-login-container">
      <div className="login-card">
        <h2>MedAssist Hospital Portal</h2>
        <p>Manage emergency requests and resources.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Hospital ID"
            value={hospitalId}
            onChange={(e) => setHospitalId(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Accessing Portal...' : 'Staff Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default HospitalLogin;