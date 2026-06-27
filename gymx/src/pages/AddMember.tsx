import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGymStore } from '../store/gymStore'
import { supabase } from '../lib/supabase'
import { User, Phone, MapPin, ChevronRight, ChevronLeft, Dumbbell, Calendar } from 'lucide-react'

export default function AddMember() {
  const { gym } = useGymStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    gender: '',
    dob: '',
    weight: '',
    height: '',
    goal: '',
    notes: '',
    plan_name: '',
    plan_duration_months: 1,
    plan_price: 0,
    join_date: new Date().toISOString().split('T')[0],
    payment_mode: 'Cash',
    payment_amount: 0,
  })

  const update = (field: string, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const plans = [
    { name: 'Monthly', months: 1, price: 1500 },
    { name: 'Quarterly', months: 3, price: 4000 },
    { name: 'Half-Yearly', months: 6, price: 7000 },
    { name: '9 Months', months: 9, price: 9500 },
    { name: 'Annual', months: 12, price: 12000 },
  ]

  const calculateExpiry = (joinDate: string, months: number) => {
    const date = new Date(joinDate)
    date.setMonth(date.getMonth() + months)
    return date.toISOString().split('T')[0]
  }

  const handleSubmit = async () => {
    if (!form.name || !form.phone) {
      setError('Name and phone are required')
      return
    }
    if (!form.plan_name) {
      setError('Please select a plan')
      return
    }

    setLoading(true)
    setError('')

    try {
      const expiry_date = calculateExpiry(form.join_date, form.plan_duration_months)

      const { data: member, error: memberError } = await supabase
        .from('members')
        .insert({
          gym_id: gym!.id,
          name: form.name,
          phone: form.phone,
          address: form.address,
          city: form.city,
          gender: form.gender,
          dob: form.dob || null,
          weight: form.weight ? parseFloat(form.weight) : null,
          height: form.height ? parseFloat(form.height) : null,
          goal: form.goal,
          notes: form.notes,
          plan_name: form.plan_name,
          plan_duration_months: form.plan_duration_months,
          join_date: form.join_date,
          expiry_date,
          status: 'active',
        })
        .select()
        .single()

      if (memberError) throw memberError

      if (form.payment_amount > 0) {
        await supabase.from('payments').insert({
          gym_id: gym!.id,
          member_id: member.id,
          member_name: form.name,
          plan_name: form.plan_name,
          amount: form.payment_amount,
          payment_mode: form.payment_mode,
          payment_date: form.join_date,
        })
      }

      navigate('/members')
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  const stepTitles = ['Profile', 'Body & Goal', 'Membership']
  const stepSubs = ['Who is joining', 'Fitness baseline', 'Plan & payment']

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : navigate('/members')}
          className="p-2 rounded-xl hover:bg-gray-100 transition-all"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">New Member</h1>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center gap-0 mb-8">
        {stepTitles.map((title, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > i + 1 ? 'bg-green-500 text-white' :
                step === i + 1 ? 'bg-[#E8593C] text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <p className="text-xs font-medium text-gray-700 mt-1">{title}</p>
              <p className="text-xs text-gray-400">{stepSubs[i]}</p>
            </div>
            {i < 2 && (
              <div className={`w-16 h-0.5 mb-6 mx-1 ${step > i + 1 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Step 1 — Profile */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name *</label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="e.g. Arjun Mehta"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Number *</label>
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
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</label>
            <div className="relative mt-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={form.address}
                onChange={e => update('address', e.target.value)}
                placeholder="Area, City"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gender *</label>
            <div className="flex gap-3 mt-1">
              {['Male', 'Female', 'Other'].map(g => (
                <button
                  key={g}
                  onClick={() => update('gender', g)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    form.gender === g
                      ? 'bg-[#E8593C] text-white border-[#E8593C]'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date of Birth</label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="date"
                value={form.dob}
                onChange={e => update('dob', e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
              />
            </div>
          </div>

          <button
            onClick={() => {
              if (!form.name || !form.phone || !form.gender) {
                setError('Name, phone and gender are required')
                return
              }
              setError('')
              setStep(2)
            }}
            className="w-full bg-gradient-to-r from-[#E8593C] to-[#d44025] text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 hover:shadow-md transition-all"
          >
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2 — Body & Goal */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Weight (kg)</label>
              <input
                type="number"
                value={form.weight}
                onChange={e => update('weight', e.target.value)}
                placeholder="70"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Height (cm)</label>
              <input
                type="number"
                value={form.height}
                onChange={e => update('height', e.target.value)}
                placeholder="170"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fitness Goal</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {['Weight Loss', 'Muscle Gain', 'General Fitness', 'Yoga & Flexibility', 'Strength', 'Cardio'].map(g => (
                <button
                  key={g}
                  onClick={() => update('goal', g)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all text-left ${
                    form.goal === g
                      ? 'bg-[#E8593C] text-white border-[#E8593C]'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Any health issues, special requirements..."
              rows={3}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C] resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 font-semibold hover:bg-gray-50 transition-all"
            >
              Back
            </button>
            <button
              onClick={() => { setError(''); setStep(3) }}
              className="flex-1 bg-gradient-to-r from-[#E8593C] to-[#d44025] text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 hover:shadow-md transition-all"
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Membership */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Join Date</label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="date"
                value={form.join_date}
                onChange={e => update('join_date', e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Select Plan *</label>
            <div className="space-y-2">
              {plans.map(plan => (
                <button
                  key={plan.name}
                  onClick={() => {
                    update('plan_name', plan.name)
                    update('plan_duration_months', plan.months)
                    update('plan_price', plan.price)
                    update('payment_amount', plan.price)
                  }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    form.plan_name === plan.name
                      ? 'border-[#E8593C] bg-[#E8593C]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{plan.name}</p>
                      <p className="text-sm text-gray-500">{plan.months} month{plan.months > 1 ? 's' : ''}</p>
                    </div>
                    <p className="font-bold text-[#E8593C]">₹{plan.price.toLocaleString('en-IN')}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {form.plan_name && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">
                Expiry: <span className="font-semibold text-gray-900">
                  {new Date(calculateExpiry(form.join_date, form.plan_duration_months))
                    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Amount (₹)</label>
            <input
              type="number"
              value={form.payment_amount}
              onChange={e => update('payment_amount', parseFloat(e.target.value))}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Mode</label>
            <div className="flex gap-2 mt-1">
              {['Cash', 'UPI', 'Bank'].map(mode => (
                <button
                  key={mode}
                  onClick={() => update('payment_mode', mode)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    form.payment_mode === mode
                      ? 'bg-[#E8593C] text-white border-[#E8593C]'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 font-semibold hover:bg-gray-50 transition-all"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-[#E8593C] to-[#d44025] text-white rounded-xl py-3 font-semibold hover:shadow-md transition-all disabled:opacity-60"
            >
              {loading ? 'Saving...' : '🚀 Add Member'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}