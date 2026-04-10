import React from 'react';
import { useAdminLogin } from '../hooks/useAdminLogin';
import './AdminLogin.scss';

const AdminLogin = () => {
  const { adminId, setAdminId, password, setPassword, handleLogin, loading, error } = useAdminLogin();

  return (
    <div className="admin-login-container">
      <div className="login-card">
        <h2>MedAssist System Admin</h2>
        <p>Secure login for system administrators.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Admin ID"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
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
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;