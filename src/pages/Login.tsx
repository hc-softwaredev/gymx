import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useGymStore } from '../store/gymStore'
import { Dumbbell, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const { setUser, fetchGym } = useGymStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (data.user) {
      setUser({ id: data.user.id, email: data.user.email! })
      await fetchGym(data.user.id)
      navigate('/')
    }
    setLoading(false)
  }

  const handleDemo = async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'demo@gymx.in',
      password: 'demo123456'
    })
    if (error) {
      setError('Demo account not set up yet')
      setLoading(false)
      return
    }
    if (data.user) {
      setUser({ id: data.user.id, email: data.user.email! })
      await fetchGym(data.user.id)
      navigate('/')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#E8593C] to-[#d44025] rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <Dumbbell className="text-white" size={32} />
          </div>
          <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">GymX</span>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to manage your gym</p>
        </div>

        {/* Demo Button */}
        <button
          onClick={handleDemo}
          className="w-full bg-gradient-to-r from-[#E8593C] to-[#d44025] text-white rounded-full py-3.5 font-semibold flex items-center justify-center gap-2 mb-4 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          ⭐ Try Demo — See it Live
          <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">FREE</span>
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-xs text-gray-400 font-medium">OR SIGN IN</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full border border-gray-200 rounded-full py-3 flex items-center justify-center gap-3 text-gray-700 font-medium hover:bg-gray-50 transition-all mb-4"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="text-xs text-gray-400">OR</span>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gym.in"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#E8593C] to-[#d44025] text-white rounded-full py-3.5 font-semibold hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            New here?{' '}
            <Link to="/register" className="text-[#E8593C] font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}