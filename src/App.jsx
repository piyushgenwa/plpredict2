import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import Navbar from './components/layout/Navbar.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import AdminRoute from './components/layout/AdminRoute.jsx'

import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import MatchesPage from './pages/MatchesPage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import PredictionsPage from './pages/PredictionsPage.jsx'
import UserProfilePage from './pages/UserProfilePage.jsx'
import AdminPage from './pages/admin/AdminPage.jsx'
import FixturesPage from './pages/admin/FixturesPage.jsx'
import ResultsPage from './pages/admin/ResultsPage.jsx'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-950">
          <Navbar />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/my-predictions" element={<PredictionsPage />} />
              <Route path="/profile/:userId" element={<UserProfilePage />} />
            </Route>

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/fixtures" element={<FixturesPage />} />
              <Route path="/admin/results" element={<ResultsPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/matches" replace />} />
            <Route path="*" element={<Navigate to="/matches" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
