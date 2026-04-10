import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { token, role } = useSelector((state) => state.auth);

  // If no token exists, kick them back to their login page
  if (!token) {
    if (allowedRole === 'admin') return <Navigate to="/admin/login" replace />;
    if (allowedRole === 'hospital') return <Navigate to="/hospital/login" replace />;
    return <Navigate to="/" replace />; // Default patient login
  }

  // If they have a token, but the wrong role (e.g., patient trying to view admin page)
  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  // If everything is good, render the page!
  return children;
};

export default ProtectedRoute;