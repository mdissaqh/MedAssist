import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Public Views
import PatientLogin from './features/Patient/Login/ui/PatientLogin';
import AdminLogin from './features/Admin/Login/ui/AdminLogin';
import HospitalLogin from './features/Hospital/Login/ui/HospitalLogin';

// Protected Views
import ProtectedRoute from './components/ProtectedRoute';
import HospitalManager from './features/Admin/HospitalManagement/ui/HospitalManager';
import PatientChat from './features/Patient/Chat/ui/PatientChat';
import HospitalLayout from './features/Hospital/Dashboard/ui/HospitalLayout.jsx';

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* ================= PUBLIC ROUTES ================= */}
        <Route path="/" element={<PatientLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/hospital/login" element={<HospitalLogin />} />

        {/* ================= PROTECTED ROUTES ================= */}
        
        {/* 1. Admin Route */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRole="admin">
              <HospitalManager />
            </ProtectedRoute>
          }
        />
        
        {/* 2. Patient Route */}
        <Route
          path="/patient/dashboard"
          element={
            <ProtectedRoute allowedRole="patient">
              <PatientChat />
            </ProtectedRoute>
          }
        />

        {/* 3. Hospital Route (Using your new Sidebar Layout) */}
        <Route 
          path="/hospital/dashboard" 
          element={
            <ProtectedRoute allowedRole="hospital">
              <HospitalLayout /> 
            </ProtectedRoute>
          } 
        />

      </Routes>
    </Router>
  );
}

export default App;