import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PatientLogin from './features/Patient/Login/ui/PatientLogin';
import AdminLogin from './features/Admin/Login/ui/AdminLogin';
import HospitalLogin from './features/Hospital/Login/ui/HospitalLogin';
import HospitalManager from './features/Admin/HospitalManagement/ui/HospitalManager';
import ProtectedRoute from './components/ProtectedRoute';
import HospitalDashboard from './features/Hospital/Dashboard/ui/HospitalDashboard';
import PatientChat from './features/Patient/Chat/ui/PatientChat';
import HospitalLayout from './features/Hospital/Dashboard/ui/HospitalLayout';

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PatientLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/hospital/login" element={<HospitalLogin />} />

        {/* Protected Routes! */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRole="admin">
              <HospitalManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hospital/dashboard"
          element={
            <ProtectedRoute allowedRole="hospital">
              <HospitalDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/dashboard"
          element={
            <ProtectedRoute allowedRole="patient">
              <PatientChat />
            </ProtectedRoute>
          }
        />

        <Route path="/patient/dashboard" element={<h2>Patient Dashboard</h2>} />
        <Route path="/hospital/dashboard" element={<h2>Hospital Dashboard</h2>} />
        <Route path="/hospital/dashboard" element={<ProtectedRoute allowedRole="hospital"><HospitalLayout /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;