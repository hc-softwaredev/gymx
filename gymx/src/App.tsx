import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useGymStore } from './store/gymStore'
import Login from './pages/Login'
import Register from './pages/Register'
import Layout from './components/Layout'

function App() {
  const { user, setUser, fetchGym } = useGymStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email! })
        await fetchGym(session.user.id)
      } else {
        setUser(null)
      }
      setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email! })
          await fetchGym(session.user.id)
        } else {
          setUser(null)
        }
        setReady(true)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#E8593C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Loading GymX...</p>
      </div>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
        <Route path="/*" element={user ? <Layout /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App