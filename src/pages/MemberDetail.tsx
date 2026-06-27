import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Phone, MapPin, Calendar, Edit2, Trash2,
  Activity, Target, StickyNote, User, Weight, Ruler, MoreVertical
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useGymStore } from '../store/gymStore'

interface Member {
  id: string
  gym_id: string
  name: string
  phone: string
  address: string
  city: string
  gender: string
  dob: string
  photo_url: string | null
  weight: number | null
  height: number | null
  goal: string | null
  notes: string | null
  status: string
  join_date: string
  plan_name: string
  plan_duration_months: number
  expiry_date: string
}

interface Payment {
  id: string
  plan_name: string
  amount: number
  payment_date: string
  payment_mode: string
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function daysLeft(expiry: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const exp = new Date(expiry); exp.setHours(0, 0, 0, 0)
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000)
}

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const gym = useGymStore(state => state.gym)
  const [member, setMember] = useState<Member | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id && gym?.id) fetchData()
  }, [id, gym?.id])

  async function fetchData() {
    setLoading(true)
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from('members').select('*').eq('id', id).single(),
      supabase.from('payments').select('id, plan_name, amount, payment_date, payment_mode')
        .eq('member_id', id).order('payment_date', { ascending: false }),
    ])
    if (m) setMember(m)
    if (p) setPayments(p)
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this member? This cannot be undone.')) return
    setDeleting(true)
    await supabase.from('members').delete().eq('id', id)
    navigate('/members')
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto animate-pulse">
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Member not found.</p>
        <button onClick={() => navigate('/members')} className="mt-3 text-[#E8593C] text-sm">← Back</button>
      </div>
    )
  }

  const days = daysLeft(member.expiry_date)
  const statusLabel = days < 0 ? 'Expired' : days <= 7 ? `${days}d left` : 'Active'
  const statusColor = days < 0
    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    : days <= 7
    ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
    : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'

  const age = member.dob
    ? Math.floor((Date.now() - new Date(member.dob).getTime()) / (365.25 * 86400000))
    : null

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate('/members')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Members
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <MoreVertical size={18} />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-10 min-w-[140px] overflow-hidden">
              <button
                onClick={() => { setShowMenu(false); navigate(`/members/${id}/edit`) }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left"
              >
                <Edit2 size={14} /> Edit Member
              </button>
              <button
                onClick={() => { setShowMenu(false); handleDelete() }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
              >
                <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-4">
        <div className="flex items-start gap-4">
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E8593C] to-[#f07b5e] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {initials(member.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{member.name}</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{member.plan_name} · {member.plan_duration_months}mo</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <a href={`tel:${member.phone}`} className="flex items-center gap-1.5 text-xs text-[#E8593C] font-medium hover:underline">
                <Phone size={13} /> {member.phone}
              </a>
              <a
                href={`https://wa.me/91${member.phone.replace(/\D/g, '')}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-green-600 font-medium hover:underline"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Plan & dates */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Join Date', value: new Date(member.join_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), icon: Calendar },
          { label: 'Expiry Date', value: new Date(member.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className="text-[#E8593C]" />
              <p className="text-xs text-gray-400 font-medium">{label}</p>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Personal info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <User size={14} className="text-[#E8593C]" /> Personal Info
        </h3>
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          {[
            { label: 'Gender', value: member.gender || '—' },
            { label: 'Age', value: age ? `${age} years` : '—' },
            { label: 'City', value: member.city || '—' },
            { label: 'Address', value: member.address || '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-gray-900 dark:text-white font-medium">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Body stats */}
      {(member.weight || member.height) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {member.weight && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Weight size={14} className="text-[#E8593C]" />
                <p className="text-xs text-gray-400">Weight</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{member.weight} <span className="text-sm font-normal text-gray-400">kg</span></p>
            </div>
          )}
          {member.height && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Ruler size={14} className="text-[#E8593C]" />
                <p className="text-xs text-gray-400">Height</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{member.height} <span className="text-sm font-normal text-gray-400">cm</span></p>
            </div>
          )}
        </div>
      )}

      {/* Goal */}
      {member.goal && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Target size={14} className="text-[#E8593C]" /> Fitness Goal
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">{member.goal}</p>
        </div>
      )}

      {/* Notes */}
      {member.notes && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <StickyNote size={14} className="text-[#E8593C]" /> Notes
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">{member.notes}</p>
        </div>
      )}

      {/* Payment history */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Activity size={14} className="text-[#E8593C]" /> Payment History
        </h3>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-400">No payments recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.plan_name}</p>
                  <p className="text-xs text-gray-400">{new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {p.payment_mode}</p>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">₹{p.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
