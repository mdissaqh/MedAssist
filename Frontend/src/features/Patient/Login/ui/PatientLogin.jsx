import React from 'react';
import { usePatientLogin } from '../hooks/usePatientLogin';
import './PatientLogin.scss';

const PatientLogin = () => {
  const { mobileNumber, setMobileNumber, handleLogin, loading, error } = usePatientLogin();

  return (
    <div className="patient-login-container">
      <div className="login-card">
        <h2>MedAssist Emergency</h2>
        <p>Enter your mobile number for rapid access.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin}>
          <input
            type="tel"
            placeholder="Mobile Number (e.g., 9876543210)"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            required
            pattern="[0-9]{10}"
            title="Please enter a valid 10-digit mobile number"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Connecting...' : 'Get Help Now'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PatientLogin;