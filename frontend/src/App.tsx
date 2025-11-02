import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetails from './pages/ClientDetails'
import NewClient from './pages/NewClient'
import Requests from './pages/Requests'
import RequestDetails from './pages/RequestDetails'
import NewRequest from './pages/NewRequest'
import KanbanBoard from './pages/KanbanBoard'
import Admin from './pages/Admin'
import Formulas from './pages/Formulas'
import Audit from './pages/Audit'
import Profile from './pages/Profile'
import BanksFinancing from './pages/BanksFinancing'
import EditRequest from './pages/EditRequest'
import Inventory from './pages/Inventory'
import Files from './pages/Files'

function App() {
  const { /* user, */ isAuthenticated, isLoading } = useAuthStore()

  // Check if we have tokens but not authenticated (app just loaded)
  const hasTokens = localStorage.getItem('accessToken') && localStorage.getItem('refreshToken')
  
  // Show loading if authentication is in progress
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  // If not authenticated and no tokens, show login
  if (!isAuthenticated && !hasTokens) {
    return <Login />
  }

  // If we have tokens but not authenticated yet, show loading
  if (!isAuthenticated && hasTokens) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحقق من المصادقة...</p>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/new" element={<NewClient />} />
        <Route path="/clients/:id" element={<ClientDetails />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/requests/new" element={<NewRequest />} />
        <Route path="/requests/:id" element={<RequestDetails />} />
        <Route path="/requests/:id/edit" element={<EditRequest />} />
        <Route path="/kanban" element={<KanbanBoard />} />
        <Route path="/banks-financing" element={<BanksFinancing />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/files" element={<Files />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/formulas" element={<Formulas />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
