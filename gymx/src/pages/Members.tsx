import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus, Phone, Calendar, ChevronRight, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useGymStore } from '../store/gymStore'

interface Member {
  id: string
  gym_id: string
  name: string
  phone: string
  gender: string
  plan_name: string
  plan_duration_months: number
  expiry_date: string
  join_date: string
  status: string
  photo_url: string | null
  goal: string | null
}

type FilterTab = 'All' | 'Active' | 'Expiring' | 'Expired'

function getStatusInfo(expiry: string): { label: string; color: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(expiry)
  exp.setHours(0, 0, 0, 0)
  const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) return { label: 'Expired', color: 'bg-red-100 text-red-600' }
  if (diff <= 7) return { label: `${diff}d left`, color: 'bg-orange-100 text-orange-600' }
  if (diff <= 30) return { label: `${diff}d left`, color: 'bg-yellow-100 text-yellow-700' }
  return { label: 'Active', color: 'bg-green-100 text-green-600' }
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name: string) {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-teal-500',
    'bg-rose-500', 'bg-amber-500', 'bg-indigo-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function Members() {
  const navigate = useNavigate()
  const gym = useGymStore(state => state.gym)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All')

  useEffect(() => {
    if (!gym?.id) return
    fetchMembers()
  }, [gym?.id])

  async function fetchMembers() {
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('members')
        .select('id, gym_id, name, phone, gender, plan_name, plan_duration_months, expiry_date, join_date, status, photo_url, goal')
        .eq('gym_id', gym!.id)
        .order('join_date', { ascending: false })

      if (err) throw err
      setMembers(data ?? [])
    } catch (e: any) {
      setError(e.message ?? 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    const matchSearch = m.name.toLowerCase().includes(q) || m.phone.includes(q)
    if (!matchSearch) return false

    if (activeFilter === 'All') return true
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exp = new Date(m.expiry_date); exp.setHours(0, 0, 0, 0)
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (activeFilter === 'Active') return diff > 7
    if (activeFilter === 'Expiring') return diff >= 0 && diff <= 7
    if (activeFilter === 'Expired') return diff < 0
    return true
  })

  const tabs: FilterTab[] = ['All', 'Active', 'Expiring', 'Expired']

  const counts = {
    All: members.length,
    Active: members.filter(m => {
      const diff = Math.ceil((new Date(m.expiry_date).getTime() - Date.now()) / 86400000)
      return diff > 7
    }).length,
    Expiring: members.filter(m => {
      const diff = Math.ceil((new Date(m.expiry_date).getTime() - Date.now()) / 86400000)
      return diff >= 0 && diff <= 7
    }).length,
    Expired: members.filter(m => new Date(m.expiry_date) < new Date()).length,
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Members</h1>
          <p className="text-sm text-gray-500 mt-0.5">{members.length} total members</p>
        </div>
        <button
          onClick={() => navigate('/add-member')}
          className="flex items-center gap-2 bg-[#E8593C] hover:bg-[#d44e33] text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <UserPlus size={16} />
          <span className="hidden sm:inline">Add Member</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === tab
                ? 'bg-[#E8593C] text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {tab}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeFilter === tab ? 'bg-white/20 text-white' : 'bg-white dark:bg-gray-600 text-gray-500 dark:text-gray-400'
            }`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* States */}
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400">
          <AlertCircle size={18} />
          <p className="text-sm">{error}</p>
          <button onClick={fetchMembers} className="ml-auto text-sm underline">Retry</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No members found</p>
          <p className="text-gray-400 text-sm mt-1">
            {search ? 'Try a different search term' : 'Add your first member to get started'}
          </p>
          {!search && (
            <button
              onClick={() => navigate('/add-member')}
              className="mt-4 text-[#E8593C] text-sm font-medium hover:underline"
            >
              + Add Member
            </button>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(member => {
            const status = getStatusInfo(member.expiry_date)
            const color = avatarColor(member.name)
            return (
              <button
                key={member.id}
                onClick={() => navigate(`/members/${member.id}`)}
                className="text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all group"
              >
                <div className="flex items-start gap-3">
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.name}
                      className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className={`w-11 h-11 rounded-full ${color} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                      {initials(member.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">{member.name}</p>
                      <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-0.5 transition-colors" />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{member.plan_name}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Phone size={11} />
                      {member.phone}
                    </span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                  <Calendar size={11} />
                  <span>Expires {new Date(member.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
