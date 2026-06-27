import { useEffect, useState } from 'react'
import { Phone, MessageCircle, RefreshCw, X, Search, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useGymStore } from '../store/gymStore'

interface Member {
  id: string
  name: string
  phone: string
  plan_name: string
  plan_duration_months: number
  expiry_date: string
  photo_url: string | null
}

interface Plan {
  id: string
  name: string
  duration_months: number
  price: number
}

type Filter = 'today' | '7' | '15' | '30' | '60' | 'expired'

const FILTER_LABELS: Record<Filter, string> = {
  today: 'Today',
  '7': '7 days',
  '15': '15 days',
  '30': '30 days',
  '60': '60 days',
  expired: 'Expired',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function daysLeft(expiry: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const exp = new Date(expiry); exp.setHours(0, 0, 0, 0)
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000)
}

export default function Renewals() {
  const gym = useGymStore(state => state.gym)
  const [members, setMembers] = useState<Member[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [filter, setFilter] = useState<Filter>('30')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [renewMember, setRenewMember] = useState<Member | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [payMode, setPayMode] = useState('Cash')
  const [discount, setDiscount] = useState('')
  const [renewing, setRenewing] = useState(false)

  useEffect(() => { if (gym?.id) fetchData() }, [gym?.id])

  async function fetchData() {
    setLoading(true)
    const [{ data: mems }, { data: plns }] = await Promise.all([
      supabase.from('members').select('id, name, phone, plan_name, plan_duration_months, expiry_date, photo_url')
        .eq('gym_id', gym!.id).order('expiry_date'),
      supabase.from('plans').select('*').eq('gym_id', gym!.id).order('price'),
    ])
    setMembers(mems ?? [])
    setPlans(plns ?? [])
    setLoading(false)
  }

  const filtered = members.filter(m => {
    const days = daysLeft(m.expiry_date)
    const q = search.toLowerCase()
    const matchSearch = m.name.toLowerCase().includes(q) || m.phone.includes(q)
    if (!matchSearch) return false

    if (filter === 'expired') return days < 0
    if (filter === 'today') return days === 0
    return days >= 0 && days <= parseInt(filter)
  })

  function whatsappMsg(m: Member) {
    const days = daysLeft(m.expiry_date)
    const expText = days < 0 ? 'has expired' : days === 0 ? 'expires today' : `expires in ${days} days`
    return encodeURIComponent(
      `Hi ${m.name.split(' ')[0]}! 👋\n\nYour ${gym?.name ?? 'gym'} membership ${expText} (${new Date(m.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}).\n\nRenew now to continue your fitness journey! 💪\n\nCall us: ${gym?.phone ?? ''}`
    )
  }

  async function handleRenew() {
    if (!renewMember || !selectedPlan) return
    setRenewing(true)

    // Calculate new expiry from today or from old expiry (whichever is later)
    const baseDate = new Date() > new Date(renewMember.expiry_date) ? new Date() : new Date(renewMember.expiry_date)
    baseDate.setMonth(baseDate.getMonth() + selectedPlan.duration_months)
    const newExpiry = baseDate.toISOString().split('T')[0]
    const finalAmount = selectedPlan.price - (parseFloat(discount) || 0)

    await Promise.all([
      supabase.from('members').update({
        plan_name: selectedPlan.name,
        plan_duration_months: selectedPlan.duration_months,
        expiry_date: newExpiry,
      }).eq('id', renewMember.id),
      supabase.from('payments').insert({
        gym_id: gym!.id,
        member_id: renewMember.id,
        member_name: renewMember.name,
        plan_name: selectedPlan.name,
        amount: finalAmount,
        discount: parseFloat(discount) || 0,
        payment_mode: payMode,
        payment_date: new Date().toISOString().split('T')[0],
        notes: 'Renewal',
      }),
    ])

    setRenewing(false)
    setRenewMember(null)
    setSelectedPlan(null)
    setDiscount('')
    fetchData()
  }

  const filters: Filter[] = ['today', '7', '15', '30', '60', 'expired']

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Renewals</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track expiring & expired memberships</p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? f === 'expired' ? 'bg-red-500 text-white' : 'bg-[#E8593C] text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search member..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No members in this range</p>
          <p className="text-gray-400 text-sm mt-1">Great news — everyone's up to date!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const days = daysLeft(m.expiry_date)
            const isExpired = days < 0
            const badgeColor = isExpired
              ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              : days <= 7 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500'

            return (
              <div key={m.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-start gap-3">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#E8593C]/10 flex items-center justify-center text-[#E8593C] text-sm font-semibold flex-shrink-0">
                      {initials(m.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{m.name}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {isExpired ? `Expired ${Math.abs(days)}d ago` : days === 0 ? 'Today!' : `${days}d left`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{m.plan_name}</p>
                    <p className="text-xs text-gray-400">
                      Expires: {new Date(m.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <a
                    href={`tel:${m.phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 transition-colors"
                  >
                    <Phone size={13} /> Call
                  </a>
                  <a
                    href={`https://wa.me/91${m.phone.replace(/\D/g, '')}?text=${whatsappMsg(m)}`}
                    target="_blank" rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium hover:bg-green-100 transition-colors"
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                  <button
                    onClick={() => { setRenewMember(m); setSelectedPlan(null); setDiscount('') }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#E8593C] text-white text-xs font-medium hover:bg-[#d44e33] transition-colors"
                  >
                    <RefreshCw size={13} /> Renew
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Renewal Modal */}
      {renewMember && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Renew Membership</h3>
                <p className="text-sm text-gray-500">{renewMember.name}</p>
              </div>
              <button onClick={() => setRenewMember(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Plan picker */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Plan</p>
                {plans.length === 0 ? (
                  <p className="text-sm text-gray-400">No plans added yet. Add plans in the Plans section.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {plans.map(plan => (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          selectedPlan?.id === plan.id
                            ? 'border-[#E8593C] bg-[#E8593C]/5'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{plan.name}</p>
                        <p className="text-xs text-gray-400">{plan.duration_months}mo</p>
                        <p className="text-sm font-bold text-[#E8593C] mt-1">₹{plan.price.toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Discount */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Discount (₹)</label>
                <input
                  type="number"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                />
              </div>

              {/* Payment mode */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Mode</p>
                <div className="flex gap-2">
                  {['Cash', 'UPI', 'Card', 'Bank Transfer'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setPayMode(mode)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                        payMode === mode
                          ? 'bg-[#E8593C] text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {selectedPlan && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Plan</span><span>{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Amount</span><span>₹{selectedPlan.price.toLocaleString()}</span>
                  </div>
                  {parseFloat(discount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span><span>-₹{parseFloat(discount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-2 mt-1">
                    <span>Total</span>
                    <span>₹{(selectedPlan.price - (parseFloat(discount) || 0)).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleRenew}
                disabled={!selectedPlan || renewing}
                className="w-full py-3 bg-[#E8593C] text-white rounded-xl font-semibold text-sm hover:bg-[#d44e33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {renewing ? 'Processing...' : 'Confirm Renewal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
