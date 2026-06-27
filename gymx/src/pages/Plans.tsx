import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Star, X, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useGymStore } from '../store/gymStore'

interface Plan {
  id: string
  gym_id: string
  name: string
  duration_months: number
  price: number
  is_popular: boolean
}

const DEFAULT_FORM = { name: '', duration_months: 1, price: '', is_popular: false }
type PlanForm = typeof DEFAULT_FORM

const DURATION_PRESETS = [
  { label: '1 Month', months: 1 },
  { label: '3 Months', months: 3 },
  { label: '6 Months', months: 6 },
  { label: '9 Months', months: 9 },
  { label: '12 Months', months: 12 },
]

export default function Plans() {
  const gym = useGymStore(state => state.gym)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PlanForm>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (gym?.id) fetchPlans() }, [gym?.id])

  async function fetchPlans() {
    setLoading(true)
    const { data } = await supabase.from('plans').select('*').eq('gym_id', gym!.id).order('price')
    setPlans(data ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setShowModal(true)
  }

  function openEdit(plan: Plan) {
    setEditingId(plan.id)
    setForm({ name: plan.name, duration_months: plan.duration_months, price: String(plan.price), is_popular: plan.is_popular })
    setShowModal(true)
  }

  async function savePlan() {
    if (!form.name || !form.price) return
    setSaving(true)

    const payload = {
      gym_id: gym!.id,
      name: form.name,
      duration_months: Number(form.duration_months),
      price: parseFloat(form.price),
      is_popular: form.is_popular,
    }

    if (editingId) {
      await supabase.from('plans').update(payload).eq('id', editingId)
    } else {
      await supabase.from('plans').insert(payload)
    }

    setSaving(false)
    setShowModal(false)
    fetchPlans()
  }

  async function deletePlan(id: string) {
    if (!confirm('Delete this plan?')) return
    await supabase.from('plans').delete().eq('id', id)
    setPlans(prev => prev.filter(p => p.id !== id))
  }

  async function togglePopular(plan: Plan) {
    await supabase.from('plans').update({ is_popular: !plan.is_popular }).eq('id', plan.id)
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_popular: !p.is_popular } : p))
  }

  const monthlyEquiv = (price: number, months: number) => (price / months).toFixed(0)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plans</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage membership plans</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#E8593C] hover:bg-[#d44e33] text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <Plus size={16} /> Add Plan
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-pulse h-36" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No plans yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first membership plan</p>
          <button onClick={openAdd} className="mt-4 text-[#E8593C] text-sm font-medium hover:underline">+ Add Plan</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl border p-5 transition-all ${
                plan.is_popular
                  ? 'border-[#E8593C] shadow-md shadow-[#E8593C]/10'
                  : 'border-gray-100 dark:border-gray-700'
              }`}
            >
              {plan.is_popular && (
                <div className="absolute -top-2.5 left-4">
                  <span className="bg-[#E8593C] text-white text-[10px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
                    <Star size={9} fill="white" /> Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="text-sm text-gray-500">{plan.duration_months} {plan.duration_months === 1 ? 'month' : 'months'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => togglePopular(plan)}
                    className={`p-1.5 rounded-lg transition-colors ${plan.is_popular ? 'text-[#E8593C] bg-[#E8593C]/10' : 'text-gray-300 hover:text-[#E8593C] hover:bg-[#E8593C]/10'}`}
                    title="Toggle popular"
                  >
                    <Star size={15} fill={plan.is_popular ? 'currentColor' : 'none'} />
                  </button>
                  <button onClick={() => openEdit(plan)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deletePlan(plan.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {gym?.currency ?? '₹'}{plan.price.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {gym?.currency ?? '₹'}{monthlyEquiv(plan.price, plan.duration_months)}/month
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">{editingId ? 'Edit Plan' : 'New Plan'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Plan Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Monthly, Quarterly, Annual"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Duration</label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map(p => (
                    <button
                      key={p.months}
                      onClick={() => setForm(f => ({ ...f, duration_months: p.months }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        form.duration_months === p.months
                          ? 'bg-[#E8593C] text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Price ({gym?.currency ?? '₹'}) *</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm(p => ({ ...p, is_popular: !p.is_popular }))}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center ${form.is_popular ? 'bg-[#E8593C]' : 'bg-gray-200 dark:bg-gray-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow mx-1 transition-transform ${form.is_popular ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Mark as Most Popular</span>
              </label>

              <button
                onClick={savePlan}
                disabled={!form.name || !form.price || saving}
                className="w-full py-3 bg-[#E8593C] text-white rounded-xl font-semibold text-sm hover:bg-[#d44e33] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
