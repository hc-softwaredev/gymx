import { useEffect, useState } from 'react'
import {
  Plus, Search, MessageCircle, X, Filter,
  CreditCard, Wallet, Banknote, Building2,
  ChevronDown, AlertCircle, CheckCircle2, ArrowRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useGymStore } from '../store/gymStore'
 
interface Payment {
  id: string
  gym_id: string
  member_id: string
  member_name: string
  plan_name: string
  amount: number
  discount: number
  payment_mode: string
  payment_date: string
  notes: string | null
}
 
interface PendingMember {
  id: string
  name: string
  phone: string
  plan_name: string
  expiry_date: string
  plan_duration_months: number
}
 
interface MemberOption {
  id: string
  name: string
  phone: string
  plan_name: string
  plan_duration_months: number
  expiry_date: string
}
 
type Tab = 'history' | 'pending'
type PayMode = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer'
 
const PAY_MODES: PayMode[] = ['Cash', 'UPI', 'Card', 'Bank Transfer']
 
const MODE_ICONS: Record<string, React.ReactNode> = {
  Cash: <Banknote size={13} />,
  UPI: <Wallet size={13} />,
  Card: <CreditCard size={13} />,
  'Bank Transfer': <Building2 size={13} />,
}
 
const MODE_COLORS: Record<string, string> = {
  Cash: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
  UPI: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  Card: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  'Bank Transfer': 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
}
 
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
 
function avatarColor(name: string) {
  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-teal-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
 
function daysLeft(expiry: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const exp = new Date(expiry); exp.setHours(0, 0, 0, 0)
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000)
}
 
const DEFAULT_FORM = {
  member_id: '',
  member_name: '',
  plan_name: '',
  amount: '',
  discount: '',
  payment_mode: 'Cash' as PayMode,
  payment_date: new Date().toISOString().split('T')[0],
  notes: '',
}
 
export default function Payments() {
  const gym = useGymStore(state => state.gym)
  const navigate = useNavigate()
  const currency = gym?.currency?.split(' ')[0] ?? '₹'
 
  const [tab, setTab] = useState<Tab>('history')
  const [payments, setPayments] = useState<Payment[]>([])
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([])
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [showMemberDrop, setShowMemberDrop] = useState(false)
 
  // Filters
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<string>('All')
  const [filterMonth, setFilterMonth] = useState<string>('All')
  const [showFilters, setShowFilters] = useState(false)
 
  useEffect(() => { if (gym?.id) fetchAll() }, [gym?.id])
 
  async function fetchAll() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
 
    const [{ data: pays }, { data: mems }] = await Promise.all([
      supabase.from('payments').select('*').eq('gym_id', gym!.id).order('payment_date', { ascending: false }),
      supabase.from('members').select('id, name, phone, plan_name, plan_duration_months, expiry_date')
        .eq('gym_id', gym!.id).order('name'),
    ])
 
    setPayments(pays ?? [])
    setMemberOptions(mems ?? [])
 
    // Pending = expired members (no payment in last plan cycle)
    const expired = (mems ?? []).filter(m => m.expiry_date < today)
    setPendingMembers(expired)
    setLoading(false)
  }
 
  // Month options from payments
  const monthOptions = ['All', ...Array.from(new Set(
    payments.map(p => p.payment_date?.slice(0, 7))
  )).sort().reverse()]
 
  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = p.member_name?.toLowerCase().includes(q) || p.plan_name?.toLowerCase().includes(q)
    const matchMode = filterMode === 'All' || p.payment_mode === filterMode
    const matchMonth = filterMonth === 'All' || p.payment_date?.startsWith(filterMonth)
    return matchSearch && matchMode && matchMonth
  })
 
  const totalFiltered = filtered.reduce((sum, p) => sum + (p.amount || 0), 0)
 
  // Member search dropdown
  const filteredMembers = memberOptions.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.phone.includes(memberSearch)
  ).slice(0, 6)
 
  function selectMember(m: MemberOption) {
    setForm(f => ({
      ...f,
      member_id: m.id,
      member_name: m.name,
      plan_name: m.plan_name,
      amount: '',
    }))
    setMemberSearch(m.name)
    setShowMemberDrop(false)
  }
 
  async function addPayment() {
    if (!form.member_id || !form.amount) return
    setSaving(true)
 
    await supabase.from('payments').insert({
      gym_id: gym!.id,
      member_id: form.member_id,
      member_name: form.member_name,
      plan_name: form.plan_name,
      amount: parseFloat(form.amount),
      discount: parseFloat(form.discount) || 0,
      payment_mode: form.payment_mode,
      payment_date: form.payment_date,
      notes: form.notes || null,
    })
 
    setSaving(false)
    setShowAdd(false)
    setForm(DEFAULT_FORM)
    setMemberSearch('')
    fetchAll()
  }
 
  function whatsappReceipt(p: Payment) {
    const member = memberOptions.find(m => m.id === p.member_id)
    if (!member) return '#'
    const msg = encodeURIComponent(
      `🧾 *Payment Receipt*\n\n` +
      `Gym: *${gym?.name ?? 'GymX'}*\n` +
      `Member: *${p.member_name}*\n` +
      `Plan: ${p.plan_name}\n` +
      `Amount: *${currency}${p.amount.toLocaleString('en-IN')}*\n` +
      (p.discount > 0 ? `Discount: ${currency}${p.discount}\n` : '') +
      `Mode: ${p.payment_mode}\n` +
      `Date: ${new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n` +
      `Thank you for being a valued member! 💪`
    )
    return `https://wa.me/91${member.phone.replace(/\D/g, '')}?text=${msg}`
  }
 
  function whatsappDue(m: PendingMember) {
    const days = Math.abs(daysLeft(m.expiry_date))
    const msg = encodeURIComponent(
      `Hi ${m.name.split(' ')[0]}! 👋\n\n` +
      `Your *${gym?.name ?? 'gym'}* membership expired ${days} day${days !== 1 ? 's' : ''} ago.\n\n` +
      `Please renew your membership to continue your fitness journey! 💪\n\n` +
      `Call us: ${gym?.phone ?? ''}`
    )
    return `https://wa.me/91${m.phone.replace(/\D/g, '')}?text=${msg}`
  }
 
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {payments.length} transactions · {pendingMembers.length} pending dues
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[#E8593C] hover:bg-[#d44e33] text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Payment</span>
        </button>
      </div>
 
      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('history')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            tab === 'history' ? 'bg-[#E8593C] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          Payment History
        </button>
        <button
          onClick={() => setTab('pending')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${
            tab === 'pending' ? 'bg-[#E8593C] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          Pending Dues
          {pendingMembers.length > 0 && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${
              tab === 'pending' ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
            }`}>
              {pendingMembers.length}
            </span>
          )}
        </button>
      </div>
 
      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <>
          {/* Search + Filter */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search member or plan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                showFilters || filterMode !== 'All' || filterMonth !== 'All'
                  ? 'border-[#E8593C] text-[#E8593C] bg-[#E8593C]/5'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800'
              }`}
            >
              <Filter size={14} /> Filters
              {(filterMode !== 'All' || filterMonth !== 'All') && (
                <span className="w-2 h-2 rounded-full bg-[#E8593C]" />
              )}
            </button>
          </div>
 
          {/* Filter panel */}
          {showFilters && (
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 mb-3 space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Payment Mode</p>
                <div className="flex flex-wrap gap-2">
                  {['All', ...PAY_MODES].map(m => (
                    <button
                      key={m}
                      onClick={() => setFilterMode(m)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        filterMode === m ? 'bg-[#E8593C] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Month</p>
                <div className="flex flex-wrap gap-2">
                  {monthOptions.slice(0, 6).map(mo => (
                    <button
                      key={mo}
                      onClick={() => setFilterMonth(mo)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        filterMonth === mo ? 'bg-[#E8593C] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {mo === 'All' ? 'All Time' : new Date(mo + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </button>
                  ))}
                </div>
              </div>
              {(filterMode !== 'All' || filterMonth !== 'All') && (
                <button
                  onClick={() => { setFilterMode('All'); setFilterMonth('All') }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
 
          {/* Summary bar */}
          {filtered.length > 0 && (
            <div className="bg-[#E8593C]/5 border border-[#E8593C]/20 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">{filtered.length} transactions</span>
              <span className="text-sm font-bold text-[#E8593C]">{currency}{totalFiltered.toLocaleString('en-IN')}</span>
            </div>
          )}
 
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse h-20" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No payments found</p>
              <p className="text-gray-400 text-sm mt-1">{search || filterMode !== 'All' || filterMonth !== 'All' ? 'Try changing your filters' : 'Record your first payment'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => (
                <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full ${avatarColor(p.member_name ?? '')} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                      {initials(p.member_name ?? '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <button
                            onClick={() => navigate(`/members/${p.member_id}`)}
                            className="font-semibold text-gray-900 dark:text-white text-sm hover:text-[#E8593C] transition-colors"
                          >
                            {p.member_name}
                          </button>
                          <p className="text-xs text-gray-400">{p.plan_name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-900 dark:text-white">{currency}{p.amount.toLocaleString('en-IN')}</p>
                          {p.discount > 0 && (
                            <p className="text-xs text-green-600 dark:text-green-400">-{currency}{p.discount} off</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${MODE_COLORS[p.payment_mode] ?? 'bg-gray-100 text-gray-500'}`}>
                            {MODE_ICONS[p.payment_mode]}
                            {p.payment_mode}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <a
                          href={whatsappReceipt(p)}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium hover:underline"
                        >
                          <MessageCircle size={12} /> Receipt
                        </a>
                      </div>
                      {p.notes && (
                        <p className="text-xs text-gray-400 italic mt-1">{p.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
 
      {/* ── PENDING DUES TAB ── */}
      {tab === 'pending' && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse h-24" />
              ))}
            </div>
          ) : pendingMembers.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-green-500" />
              </div>
              <p className="text-gray-700 dark:text-gray-200 font-semibold">All dues cleared!</p>
              <p className="text-gray-400 text-sm mt-1">No members with pending payments</p>
            </div>
          ) : (
            <>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
                <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  <span className="font-bold">{pendingMembers.length}</span> members have expired memberships
                </p>
              </div>
              <div className="space-y-3">
                {pendingMembers.map(m => {
                  const overdue = Math.abs(daysLeft(m.expiry_date))
                  return (
                    <div key={m.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full ${avatarColor(m.name)} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                          {initials(m.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <button
                                onClick={() => navigate(`/members/${m.id}`)}
                                className="font-semibold text-gray-900 dark:text-white text-sm hover:text-[#E8593C] transition-colors"
                              >
                                {m.name}
                              </button>
                              <p className="text-xs text-gray-400">{m.plan_name}</p>
                            </div>
                            <span className="text-xs font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full flex-shrink-0">
                              {overdue}d overdue
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Expired: {new Date(m.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <a
                          href={`tel:${m.phone}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          📞 Call
                        </a>
                        <a
                          href={whatsappDue(m)}
                          target="_blank" rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium hover:bg-green-100 transition-colors"
                        >
                          <MessageCircle size={13} /> WhatsApp
                        </a>
                        <button
                          onClick={() => {
                            setShowAdd(true)
                            setMemberSearch(m.name)
                            setForm(f => ({ ...f, member_id: m.id, member_name: m.name, plan_name: m.plan_name }))
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#E8593C] text-white text-xs font-medium hover:bg-[#d44e33] transition-colors"
                        >
                          <Plus size={13} /> Collect
                        </button>
                        <button
                          onClick={() => navigate('/renewals')}
                          className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium hover:bg-gray-200 transition-colors"
                          title="Go to Renewals"
                        >
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
 
      {/* ── ADD PAYMENT MODAL ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">Record Payment</h3>
              <button
                onClick={() => { setShowAdd(false); setForm(DEFAULT_FORM); setMemberSearch('') }}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
 
            <div className="p-5 space-y-4">
              {/* Member picker */}
              <div className="relative">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Member *</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={memberSearch}
                    onChange={e => { setMemberSearch(e.target.value); setShowMemberDrop(true); setForm(f => ({ ...f, member_id: '', member_name: '' })) }}
                    onFocus={() => setShowMemberDrop(true)}
                    placeholder="Search member..."
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                  />
                </div>
                {showMemberDrop && filteredMembers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
                    {filteredMembers.map(m => (
                      <button
                        key={m.id}
                        onClick={() => selectMember(m)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</p>
                        <p className="text-xs text-gray-400">{m.phone} · {m.plan_name}</p>
                      </button>
                    ))}
                  </div>
                )}
                {form.member_id && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 size={12} /> {form.member_name} selected
                  </div>
                )}
              </div>
 
              {/* Plan name */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Plan</label>
                <input
                  value={form.plan_name}
                  onChange={e => setForm(f => ({ ...f, plan_name: e.target.value }))}
                  placeholder="e.g. Monthly, Quarterly"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                />
              </div>
 
              {/* Amount + Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Amount ({currency}) *</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Discount ({currency})</label>
                  <input
                    type="number"
                    value={form.discount}
                    onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                  />
                </div>
              </div>
 
              {/* Payment mode */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Payment Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAY_MODES.map(mode => (
                    <button
                      key={mode}
                      onClick={() => setForm(f => ({ ...f, payment_mode: mode }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                        form.payment_mode === mode
                          ? 'border-[#E8593C] bg-[#E8593C]/5 text-[#E8593C]'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      {MODE_ICONS[mode]} {mode}
                    </button>
                  ))}
                </div>
              </div>
 
              {/* Date */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Payment Date</label>
                <input
                  type="date"
                  value={form.payment_date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                />
              </div>
 
              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Notes</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional note..."
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                />
              </div>
 
              {/* Summary */}
              {form.amount && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Amount</span><span>{currency}{parseFloat(form.amount || '0').toLocaleString('en-IN')}</span>
                  </div>
                  {parseFloat(form.discount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span><span>-{currency}{parseFloat(form.discount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
                    <span>Total Collected</span>
                    <span>{currency}{(parseFloat(form.amount || '0') - (parseFloat(form.discount) || 0)).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
 
              <button
                onClick={addPayment}
                disabled={!form.member_id || !form.amount || saving}
                className="w-full py-3 bg-[#E8593C] text-white rounded-xl font-semibold text-sm hover:bg-[#d44e33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}