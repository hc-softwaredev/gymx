import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useGymStore } from '../store/gymStore'
import { Dumbbell, Mail, Lock, User, Phone, MapPin } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const { setUser, fetchGym } = useGymStore()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    email: '',
    password: '',
    gymName: '',
    ownerName: '',
    phone: '',
    city: '',
  })

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleRegister = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (error) throw error
      if (data.user) {
        const { error: gymError } = await supabase.from('gyms').insert({
          user_id: data.user.id,
          name: form.gymName,
          owner_name: form.ownerName,
          phone: form.phone,
          city: form.city,
          currency: 'INR',
          brand_color: '#E8593C',
        })
        if (gymError) throw gymError
        setUser({ id: data.user.id, email: data.user.email! })
        await fetchGym(data.user.id)
        navigate('/')
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
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
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Set up your gym in 2 steps</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${step >= s ? 'bg-[#E8593C] text-white' : 'bg-gray-200 text-gray-500'}`}>
                {s}
              </div>
              {s < 2 && <div className={`w-12 h-1 rounded-full ${step > s ? 'bg-[#E8593C]' : 'bg-gray-200'}`}></div>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-800 mb-4">Account details</h2>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="you@gym.in"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!form.email || !form.password) { setError('Fill all fields'); return }
                  setError('')
                  setStep(2)
                }}
                className="w-full bg-gradient-to-r from-[#E8593C] to-[#d44025] text-white rounded-full py-3.5 font-semibold hover:shadow-lg transition-all hover:scale-[1.02]"
              >
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-800 mb-4">Gym details</h2>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gym Name</label>
                <div className="relative mt-1">
                  <Dumbbell className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={form.gymName}
                    onChange={e => update('gymName', e.target.value)}
                    placeholder="Prince Fitness Center"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner Name</label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={form.ownerName}
                    onChange={e => update('ownerName', e.target.value)}
                    placeholder="Your name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => update('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">City</label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => update('city', e.target.value)}
                    placeholder="Rajkot"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-full py-3.5 font-semibold hover:bg-gray-50 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="flex-2 w-full bg-gradient-to-r from-[#E8593C] to-[#d44025] text-white rounded-full py-3.5 font-semibold hover:shadow-lg transition-all hover:scale-[1.02] disabled:opacity-60"
                >
                  {loading ? 'Creating...' : '🚀 Launch GymX!'}
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have account?{' '}
            <Link to="/login" className="text-[#E8593C] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}