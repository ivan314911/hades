import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { HouseholdProvider } from './contexts/HouseholdContext'
import Layout from './components/Layout'
import Onboarding from './pages/Onboarding'
import CalendarMonth from './pages/CalendarMonth'
import EventCreate from './pages/EventCreate'
import EventDetail from './pages/EventDetail'
import HouseholdPage from './pages/HouseholdPage'
import TrashPage from './pages/TrashPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
})

function ProtectedRoutes() {
  const { session, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-muted-foreground">Chargement…</div>
    </div>
  )

  if (!session) return <Navigate to="/onboarding" replace />

  return (
    <HouseholdProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<CalendarMonth />} />
          <Route path="/foyer" element={<HouseholdPage />} />
          <Route path="/corbeille" element={<TrashPage />} />
        </Route>
        <Route path="/evenement/nouveau" element={<EventCreate />} />
        <Route path="/evenement/:id" element={<EventDetail />} />
      </Routes>
    </HouseholdProvider>
  )
}

export default function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => reg.update()).catch(() => {})
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
