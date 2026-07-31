import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/shared/ProtectedRoute'
import Layout from './components/shared/Layout'
import Profile from './components/shared/Profile'

import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'
import ForgotPasswordPage from './components/auth/ForgotPasswordPage'

import PatientScreeningPage from './pages/PatientScreeningPage'
import PreviousScansPage from './pages/PreviousScansPage'
import ResultPage from './pages/ResultPage'
import PatientTablePage from './pages/PatientTablePage'
import PatientDetailsPage from './pages/PatientDetailsPage'
import CreatePatientPage from './pages/CreatePatientPage'
import ClinicianScreeningPage from './pages/ClinicianScreeningPage'
import AdminPage from './pages/AdminPage'
import AboutModelPage from './pages/AboutModelPage'

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>
  return <Navigate to={user ? `/${user.role}` : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/profile" element={<Profile />} />
              <Route path="/about-model" element={<AboutModelPage />} />

              <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
                <Route path="/patient" element={<PatientScreeningPage />} />
                <Route path="/patient/history" element={<PreviousScansPage />} />
                <Route path="/patient/report/:reportId" element={<ResultPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
                <Route path="/doctor" element={<PatientTablePage />} />
                <Route path="/doctor/new-patient" element={<CreatePatientPage />} />
                <Route path="/doctor/patient/:patientId" element={<PatientDetailsPage />} />
                <Route path="/doctor/patient/:patientId/new-scan" element={<ClinicianScreeningPage />} />
                <Route path="/doctor/report/:reportId" element={<ResultPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['ngo']} />}>
                <Route path="/ngo" element={<PatientTablePage />} />
                <Route path="/ngo/new-patient" element={<CreatePatientPage />} />
                <Route path="/ngo/patient/:patientId" element={<PatientDetailsPage />} />
                <Route path="/ngo/patient/:patientId/new-scan" element={<ClinicianScreeningPage />} />
                <Route path="/ngo/report/:reportId" element={<ResultPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
