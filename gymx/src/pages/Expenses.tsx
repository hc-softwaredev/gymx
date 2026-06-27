import { useEffect, useState } from 'react'
import {
  Plus, Search, Edit2, Trash2, X, Filter,
  TrendingDown, TrendingUp, Wallet, AlertCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useGymStore } from '../store/gymStore'
 
interface Expense {
  id: string
  gym_id: string
  title: string
  amount: number
  category: string
  payment_mode: string
  expense_date: string
  notes: string | null
}
 
type PayMode = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer'
 
const PAY_MODES: PayMode[] = ['Cash', 'UPI', 'Card', 'Bank Transfer']
 
const CATEGORIES = [
  'Rent', 'Electricity', 'Equipment', 'Salaries',
  'Maintenance', 'Marketing', 'Supplements', 'Cleaning', 'Internet', 'Other'
]
 
const CATEGORY_COLORS: Record<string, string> = {
  Rent: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  Electricity: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Equipment: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  Salaries: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  Maintenance: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  Marketing: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  Supplements: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  Cleaning: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  Internet: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}
 
const CATEGORY_EMOJIS: Record<string, string> = {
  Rent: '🏢', Electricity: '⚡', Equipment: '🏋️', Salaries: '👥',
  Maintenance: '🔧', Marketing: '📣', Supplements: '💊',
  Cleaning: '🧹', Internet: '🌐', Other: '📦',
}
 
const DEFAULT_FORM = {
  title: '',
  amount: '',
  category: 'Other',
  payment_mode: 'Cash' as PayMode,
  expense_date: new Date().toISOString().split('T')[0],
  notes: '',
}
 
export default function Expenses() {
  const gym = useGymStore(state => state.gym)
  const currency = gym?.currency?.split(' ')[0] ?? '₹'
 
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
 
  // Filters
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [filterMonth, setFilterMonth] = useState('All')
  const [showFilters, setShowFilters] = useState(false)
 
  // Revenue for net profit
  const [monthRevenue, setMonthRevenue] = useState(0)
 
  useEffect(() => { if (gym?.id) fetchAll() }, [gym?.id])
 
  async function fetchAll() {
    setLoading(true)
    const thisMonth = new Date().toISOString().slice(0, 7)
 
    const [{ data: exps }, { data: pays }] = await Promise.all([
      supabase.from('expenses').select('*').eq('gym_id', gym!.id).order('expense_date', { ascending: false }),
      supabase.from('payments').select('amount').eq('gym_id', gym!.id).gte('payment_date', thisMonth + '-01'),
    ])
 
    setExpenses(exps ?? [])
    setMonthRevenue((pays ?? []).reduce((s, p) => s + (p.amount || 0), 0))
    setLoading(false)
  }
 
  function openAdd() {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setShowModal(true)
  }
 
  function openEdit(e: Expense) {
    setEditingId(e.id)
    setForm({
      title: e.title,
      amount: String(e.amount),
      category: e.category,
      payment_mode: e.payment_mode as PayMode,
      expense_date: e.expense_date,
      notes: e.notes ?? '',
    })
    setShowModal(true)
  }
 
  async function saveExpense() {
    if (!form.title || !form.amount) return
    setSaving(true)
 
    const payload = {
      gym_id: gym!.id,
      title: form.title,
      amount: parseFloat(form.amount),
      category: form.category,
      payment_mode: form.payment_mode,
      expense_date: form.expense_date,
      notes: form.notes || null,
    }
 
    if (editingId) {
      await supabase.from('expenses').update(payload).eq('id', editingId)
    } else {
      await supabase.from('expenses').insert(payload)
    }
 
    setSaving(false)
    setShowModal(false)
    fetchAll()
  }
 
  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    setDeleting(id)
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
    setDeleting(null)
  }
 
  // Month options
  const monthOptions = ['All', ...Array.from(new Set(
    expenses.map(e => e.expense_date?.slice(0, 7))
  )).sort().reverse()]
 
  // Filtered
  const filtered = expenses.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'All' || e.category === filterCat
    const matchMonth = filterMonth === 'All' || e.expense_date?.startsWith(filterMonth)
    return matchSearch && matchCat && matchMonth
  })
 
  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0)
 
  // This month stats
  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthExpenses = expenses.filter(e => e.expense_date?.startsWith(thisMonth))
  const thisMonthTotal = thisMonthExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const netProfit = monthRevenue - thisMonthTotal
 
  // Category breakdown for this month
  const catBreakdown: Record<string, number> = {}
  thisMonthExpenses.forEach(e => {
    catBreakdown[e.category] = (catBreakdown[e.category] || 0) + e.amount
  })
  const topCats = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 4)
 
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{expenses.length} total records</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#E8593C] hover:bg-[#d44e33] text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <Plus size={16} /> <span className="hidden sm:inline">Add Expense</span>
        </button>
      </div>
 
      {/* This month summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
          <div className="w-8 h-8 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center mb-2">
            <TrendingUp size={16} className="text-green-500" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{currency}{monthRevenue.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-400 mt-0.5">Revenue</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
          <div className="w-8 h-8 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center mb-2">
            <TrendingDown size={16} className="text-red-500" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{currency}{thisMonthTotal.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-400 mt-0.5">Expenses</p>
        </div>
        <div className={`rounded-2xl border p-4 ${
          netProfit >= 0
            ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'
        }`}>
          <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center mb-2">
            <Wallet size={16} className={netProfit >= 0 ? 'text-green-500' : 'text-red-500'} />
          </div>
          <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {netProfit < 0 ? '-' : ''}{currency}{Math.abs(netProfit).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Net Profit</p>
        </div>
      </div>
 
      {/* Category breakdown */}
      {topCats.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">This Month by Category</p>
          <div className="space-y-2.5">
            {topCats.map(([cat, amt]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-base">{CATEGORY_EMOJIS[cat] ?? '📦'}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{cat}</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{currency}{amt.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E8593C] rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((amt / thisMonthTotal) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
 
      {/* Search + Filter */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            showFilters || filterCat !== 'All' || filterMonth !== 'All'
              ? 'border-[#E8593C] text-[#E8593C] bg-[#E8593C]/5'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800'
          }`}
        >
          <Filter size={14} /> Filters
          {(filterCat !== 'All' || filterMonth !== 'All') && (
            <span className="w-2 h-2 rounded-full bg-[#E8593C]" />
          )}
        </button>
      </div>
 
      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 mb-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Category</p>
            <div className="flex flex-wrap gap-2">
              {['All', ...CATEGORIES].map(c => (
                <button
                  key={c}
                  onClick={() => setFilterCat(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterCat === c ? 'bg-[#E8593C] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {c !== 'All' && CATEGORY_EMOJIS[c]} {c}
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
          {(filterCat !== 'All' || filterMonth !== 'All') && (
            <button onClick={() => { setFilterCat('All'); setFilterMonth('All') }} className="text-xs text-red-500 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      )}
 
      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="bg-[#E8593C]/5 border border-[#E8593C]/20 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">{filtered.length} expenses</span>
          <span className="text-sm font-bold text-[#E8593C]">{currency}{totalFiltered.toLocaleString('en-IN')}</span>
        </div>
      )}
 
      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No expenses found</p>
          <p className="text-gray-400 text-sm mt-1">
            {search || filterCat !== 'All' || filterMonth !== 'All' ? 'Try changing your filters' : 'Start tracking your gym expenses'}
          </p>
          {!search && filterCat === 'All' && filterMonth === 'All' && (
            <button onClick={openAdd} className="mt-4 text-[#E8593C] text-sm font-medium hover:underline">+ Add Expense</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(e => (
            <div key={e.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-xl flex-shrink-0">
                  {CATEGORY_EMOJIS[e.category] ?? '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{e.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[e.category] ?? CATEGORY_COLORS.Other}`}>
                          {e.category}
                        </span>
                        <span className="text-xs text-gray-400">{e.payment_mode}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(e.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {e.notes && <p className="text-xs text-gray-400 italic mt-1">{e.notes}</p>}
                    </div>
                    <div className="flex items-start gap-1 flex-shrink-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm mr-2">
                        {currency}{e.amount.toLocaleString('en-IN')}
                      </p>
                      <button
                        onClick={() => openEdit(e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => deleteExpense(e.id)}
                        disabled={deleting === e.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
 
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">{editingId ? 'Edit Expense' : 'Add Expense'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
 
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Monthly rent, New dumbbell set"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                />
              </div>
 
              {/* Amount */}
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
 
              {/* Category */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setForm(f => ({ ...f, category: cat }))}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors border ${
                        form.category === cat
                          ? 'border-[#E8593C] bg-[#E8593C]/5 text-[#E8593C]'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      <span>{CATEGORY_EMOJIS[cat]}</span> {cat}
                    </button>
                  ))}
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
                      className={`py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                        form.payment_mode === mode
                          ? 'border-[#E8593C] bg-[#E8593C]/5 text-[#E8593C]'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
 
              {/* Date */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Date</label>
                <input
                  type="date"
                  value={form.expense_date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
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
 
              <button
                onClick={saveExpense}
                disabled={!form.title || !form.amount || saving}
                className="w-full py-3 bg-[#E8593C] text-white rounded-xl font-semibold text-sm hover:bg-[#d44e33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}