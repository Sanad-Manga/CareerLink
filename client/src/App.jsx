import { Routes, Route } from 'react-router-dom'
import PrivateRoute from './components/PrivateRoute'
import RoleRoute from './components/RoleRoute'
import { ThemeProvider } from './context/ThemeContext'

import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ProfilePage from './pages/ProfilePage'
import EditProfilePage from './pages/EditProfilePage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import JobListPage from './pages/JobListPage'
import JobDetailPage from './pages/JobDetailPage'
import RecommendedJobsPage from './pages/RecommendedJobsPage'
import SavedJobsPage from './pages/SavedJobsPage'
import RecruiterDashboard from './pages/RecruiterDashboard'
import CreateJobPage from './pages/CreateJobPage'
import EditJobPage from './pages/EditJobPage'
import ApplicantsPage from './pages/ApplicantsPage'
import MyApplicationsPage from './pages/MyApplicationsPage'
import AdminDashboard from './pages/AdminDashboard'
import PendingRecruitersPage from './pages/PendingRecruitersPage'
import AdminJobsPage from './pages/AdminJobsPage'
import AdminUsersPage from './pages/AdminUsersPage'
import PublicProfilePage from './pages/PublicProfilePage'

import Navbar from './components/Navbar'
import Footer from './components/Footer'

function App() {
  return (
    <ThemeProvider>
      <Navbar />
      <div style={{ flex: 1 }}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/jobs" element={<JobListPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />

        {/* Any authenticated user */}
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/users/:id" element={<PrivateRoute><PublicProfilePage /></PrivateRoute>} />

        {/* Job Seeker */}
        <Route path="/jobs/recommended" element={<RoleRoute roles={['jobSeeker']}><RecommendedJobsPage /></RoleRoute>} />
        <Route path="/jobs/saved" element={<RoleRoute roles={['jobSeeker']}><SavedJobsPage /></RoleRoute>} />
        <Route path="/applications/my" element={<RoleRoute roles={['jobSeeker']}><MyApplicationsPage /></RoleRoute>} />

        {/* Private (any authenticated user) */}
        <Route path="/profile/edit" element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />
        <Route path="/profile/change-password" element={<PrivateRoute><ChangePasswordPage /></PrivateRoute>} />

        {/* Recruiter */}
        <Route path="/recruiter/dashboard" element={<RoleRoute roles={['recruiter']}><RecruiterDashboard /></RoleRoute>} />
        <Route path="/recruiter/jobs/create" element={<RoleRoute roles={['recruiter']}><CreateJobPage /></RoleRoute>} />
        <Route path="/recruiter/jobs/:id/edit" element={<RoleRoute roles={['recruiter']}><EditJobPage /></RoleRoute>} />
        <Route path="/recruiter/applicants/:jobId" element={<RoleRoute roles={['recruiter']}><ApplicantsPage /></RoleRoute>} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<RoleRoute roles={['admin']}><AdminDashboard /></RoleRoute>} />
        <Route path="/admin/recruiters" element={<RoleRoute roles={['admin']}><PendingRecruitersPage /></RoleRoute>} />
        <Route path="/admin/jobs" element={<RoleRoute roles={['admin']}><AdminJobsPage /></RoleRoute>} />
        <Route path="/admin/users" element={<RoleRoute roles={['admin']}><AdminUsersPage /></RoleRoute>} />
      </Routes>
      </div>
      <Footer />
    </ThemeProvider>
  )
}

export default App
