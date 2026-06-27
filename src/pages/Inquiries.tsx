import { useEffect, useState } from 'react'
import { Plus, Phone, MessageCircle, UserPlus, X, Search, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useGymStore } from '../store/gymStore'

interface Inquiry {
  id: string
  gym_id: string
  name: string
  phone: string
  source: string
  goal: string | null
  status: 'New' | 'Contacted' | 'Converted' | 'Lost'
  notes: string | null
  inquiry_date: string
}

type Status = 'New' | 'Contacted' | 'Converted' | 'Lost'

const STATUS_COLORS: Record<Status, string> = {
  New: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  Contacted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Converted: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  Lost: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}

const SOURCES = ['Walk-in', 'Instagram', 'Google', 'Referral', 'Facebook', 'Other']
const STATUSES: Status[] = ['New', 'Contacted', 'Converted', 'Lost']

const DEFAULT_FORM = { name: '', phone: '', source: 'Walk-in', goal: '', notes: '' }

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function Inquiries() {
  const navigate = useNavigate()
  const gym = useGymStore(state => state.gym)
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<Status | 'All'>('All')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (gym?.id) fetchData() }, [gym?.id])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('inquiries').select('*')
      .eq('gym_id', gym!.id).order('inquiry_date', { ascending: false })
    setInquiries(data ?? [])
    setLoading(false)
  }

  async function addInquiry() {
    if (!form.name || !form.phone) return
    setSaving(true)
    await supabase.from('inquiries').insert({
      gym_id: gym!.id,
      name: form.name,
      phone: form.phone,
      source: form.source,
      goal: form.goal || null,
      notes: form.notes || null,
      status: 'New',
      inquiry_date: new Date().toISOString().split('T')[0],
    })
    setForm(DEFAULT_FORM)
    setShowAdd(false)
    setSaving(false)
    fetchData()
  }

  async function updateStatus(id: string, status: Status) {
    await supabase.from('inquiries').update({ status }).eq('id', id)
    setInquiries(prev => prev.map(q => q.id === id ? { ...q, status } : q))
  }

  async function deleteInquiry(id: string) {
    if (!confirm('Delete this inquiry?')) return
    await supabase.from('inquiries').delete().eq('id', id)
    setInquiries(prev => prev.filter(q => q.id !== id))
  }

  const filtered = inquiries.filter(q => {
    const matchSearch = q.name.toLowerCase().includes(search.toLowerCase()) || q.phone.includes(search)
    const matchFilter = activeFilter === 'All' || q.status === activeFilter
    return matchSearch && matchFilter
  })

  const counts = { All: inquiries.length, New: 0, Contacted: 0, Converted: 0, Lost: 0 }
  inquiries.forEach(q => { counts[q.status]++ })

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inquiries</h1>
          <p className="text-sm text-gray-500 mt-0.5">Leads & prospects</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[#E8593C] hover:bg-[#d44e33] text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Lead</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
        />
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {(['All', ...STATUSES] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveFilter(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === s
                ? 'bg-[#E8593C] text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {s} <span className={`px-1 rounded-full ${activeFilter === s ? 'bg-white/20' : 'bg-white dark:bg-gray-600 text-gray-500'}`}>{counts[s]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No inquiries found</p>
          <p className="text-gray-400 text-sm mt-1">Add your first lead to start tracking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(q => (
            <div key={q.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E8593C]/10 flex items-center justify-center text-[#E8593C] text-sm font-semibold flex-shrink-0">
                  {initials(q.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{q.name}</p>
                      <p className="text-xs text-gray-400">{q.phone} · {q.source}</p>
                    </div>
                    {/* Status selector */}
                    <div className="relative">
                      <select
                        value={q.status}
                        onChange={e => updateStatus(q.id, e.target.value as Status)}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-full border-none cursor-pointer appearance-none pr-5 ${STATUS_COLORS[q.status]}`}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {q.goal && <p className="text-xs text-gray-500 mt-1">Goal: {q.goal}</p>}
                  {q.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{q.notes}</p>}
                  <p className="text-xs text-gray-300 dark:text-gray-500 mt-1">
                    {new Date(q.inquiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <a
                  href={`tel:${q.phone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium"
                >
                  <Phone size={12} /> Call
                </a>
                <a
                  href={`https://wa.me/91${q.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${q.name.split(' ')[0]}! Thanks for your interest in ${gym?.name ?? 'our gym'}. We'd love to have you join us! 💪`)}`}
                  target="_blank" rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium"
                >
                  <MessageCircle size={12} /> WhatsApp
                </a>
                {q.status !== 'Converted' && (
                  <button
                    onClick={() => navigate(`/add-member?name=${encodeURIComponent(q.name)}&phone=${encodeURIComponent(q.phone)}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#E8593C] text-white text-xs font-medium"
                  >
                    <UserPlus size={12} /> Convert
                  </button>
                )}
                <button
                  onClick={() => deleteInquiry(q.id)}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Inquiry Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">Add New Lead</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Name *', key: 'name', placeholder: 'Full name' },
                { label: 'Phone *', key: 'phone', placeholder: '10-digit mobile' },
                { label: 'Goal', key: 'goal', placeholder: 'Weight loss, muscle gain...' },
                { label: 'Notes', key: 'notes', placeholder: 'Any remarks...' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{f.label}</label>
                  <input
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Source</label>
                <select
                  value={form.source}
                  onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                >
                  {SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <button
                onClick={addInquiry}
                disabled={!form.name || !form.phone || saving}
                className="w-full py-3 bg-[#E8593C] text-white rounded-xl font-semibold text-sm hover:bg-[#d44e33] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Add Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
