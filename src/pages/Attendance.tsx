import { useEffect, useState } from 'react'
import { Check, X, CheckCheck, Sun, Moon, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useGymStore } from '../store/gymStore'

interface Member {
  id: string
  name: string
  photo_url: string | null
  gender: string
  plan_name: string
  expiry_date: string
}

type Shift = 'morning' | 'evening'
type AttendanceMap = Record<string, 'P' | 'A'>

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function Attendance() {
  const gym = useGymStore(state => state.gym)
  const [date, setDate] = useState(formatDate(new Date()))
  const [shift, setShift] = useState<Shift>('morning')
  const [members, setMembers] = useState<Member[]>([])
  const [attendance, setAttendance] = useState<AttendanceMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => { if (gym?.id) fetchData() }, [gym?.id, date, shift])

  async function fetchData() {
    setLoading(true)
    const [{ data: mems }, { data: atts }] = await Promise.all([
      supabase.from('members').select('id, name, photo_url, gender, plan_name, expiry_date')
        .eq('gym_id', gym!.id).order('name'),
      supabase.from('attendance').select('member_id, status')
        .eq('gym_id', gym!.id).eq('date', date).eq('shift', shift),
    ])
    setMembers(mems ?? [])
    const map: AttendanceMap = {}
    ;(atts ?? []).forEach((a: any) => { map[a.member_id] = a.status })
    setAttendance(map)
    setLoading(false)
  }

  async function mark(memberId: string, status: 'P' | 'A') {
    const current = attendance[memberId]
    // toggle off if same
    const newStatus = current === status ? undefined : status
    setSaving(memberId)

    // upsert or delete
    if (newStatus) {
      await supabase.from('attendance').upsert({
        gym_id: gym!.id,
        member_id: memberId,
        date,
        shift,
        status: newStatus,
      }, { onConflict: 'gym_id,member_id,date,shift' })
      setAttendance(prev => ({ ...prev, [memberId]: newStatus }))
    } else {
      await supabase.from('attendance').delete()
        .eq('gym_id', gym!.id).eq('member_id', memberId).eq('date', date).eq('shift', shift)
      setAttendance(prev => { const n = { ...prev }; delete n[memberId]; return n })
    }
    setSaving(null)
  }

  async function markAll(status: 'P' | 'A') {
    const rows = members.map(m => ({
      gym_id: gym!.id,
      member_id: m.id,
      date,
      shift,
      status,
    }))
    await supabase.from('attendance').upsert(rows, { onConflict: 'gym_id,member_id,date,shift' })
    const map: AttendanceMap = {}
    members.forEach(m => { map[m.id] = status })
    setAttendance(map)
  }

  function changeDate(delta: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    if (d > new Date()) return
    setDate(formatDate(d))
  }

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const presentCount = Object.values(attendance).filter(v => v === 'P').length
  const absentCount = Object.values(attendance).filter(v => v === 'A').length
  const unmarked = members.length - presentCount - absentCount

  const shiftLabel = shift === 'morning'
    ? (gym?.male_morning || '6:00 AM') + ' – ' + (gym?.male_evening || '11:00 AM')
    : (gym?.female_morning || '5:00 PM') + ' – ' + (gym?.female_evening || '9:00 PM')

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance</h1>
        <p className="text-sm text-gray-500 mt-0.5">{members.length} active members</p>
      </div>

      {/* Date picker */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-3 mb-4">
        <button onClick={() => changeDate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <input
            type="date"
            value={date}
            max={formatDate(new Date())}
            onChange={e => setDate(e.target.value)}
            className="text-xs text-[#E8593C] cursor-pointer bg-transparent border-none outline-none"
          />
        </div>
        <button
          onClick={() => changeDate(1)}
          disabled={date === formatDate(new Date())}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30"
        >
          <ChevronRight size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Shift toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShift('morning')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            shift === 'morning' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          <Sun size={15} /> Morning
        </button>
        <button
          onClick={() => setShift('evening')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            shift === 'evening' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          <Moon size={15} /> Evening
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Present', value: presentCount, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Absent', value: absentCount, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Unmarked', value: unmarked, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-700/30' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bulk actions */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => markAll('P')}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-medium hover:bg-green-100 transition-colors"
        >
          <CheckCheck size={15} /> Mark All Present
        </button>
        <button
          onClick={() => markAll('A')}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-sm font-medium hover:bg-red-100 transition-colors"
        >
          <X size={15} /> Mark All Absent
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search member..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E8593C]/30 focus:border-[#E8593C]"
        />
      </div>

      {/* Member list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-1" />
                <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(member => {
            const status = attendance[member.id]
            const isSaving = saving === member.id
            return (
              <div
                key={member.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  status === 'P'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800'
                    : status === 'A'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                }`}
              >
                {member.photo_url ? (
                  <img src={member.photo_url} alt={member.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#E8593C]/10 flex items-center justify-center text-[#E8593C] text-sm font-semibold flex-shrink-0">
                    {initials(member.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{member.name}</p>
                  <p className="text-xs text-gray-400 truncate">{member.plan_name}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => mark(member.id, 'P')}
                    disabled={!!isSaving}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      status === 'P'
                        ? 'bg-green-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-green-100 hover:text-green-600'
                    }`}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => mark(member.id, 'A')}
                    disabled={!!isSaving}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      status === 'A'
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-red-100 hover:text-red-500'
                    }`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
