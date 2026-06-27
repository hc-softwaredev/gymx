import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGymStore } from '../store/gymStore'
import { supabase } from '../lib/supabase'
import {
  Users, UserCheck, AlertTriangle, XCircle,
  Clock, Wallet, TrendingUp, CalendarCheck,
  Phone, MessageCircle, ArrowRight, RefreshCw
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
 
interface Stats {
  totalMembers: number
  activeMembers: number
  expiringSoon: number
  expired: number
  totalRevenue: number
  revenue30d: number
  todayAttendance: number
}
 
interface ExpiringMember {
  id: string
  name: string
  phone: string
  plan_name: string
  expiry_date: string
  daysLeft: number
}
 
interface RecentMember {
  id: string
  name: string
  plan_name: string
  join_date: string
  photo_url: string | null
}
 
interface ChartPoint {
  day: string
  revenue: number
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
 
export default function Dashboard() {
  const { gym } = useGymStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0, activeMembers: 0, expiringSoon: 0,
    expired: 0, totalRevenue: 0, revenue30d: 0, todayAttendance: 0,
  })
  const [expiringMembers, setExpiringMembers] = useState<ExpiringMember[]>([])
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
 
  useEffect(() => { if (gym?.id) fetchAll() }, [gym?.id])
 
  async function fetchAll() {
    setLoading(true)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    const days30ago = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
 
    const [
      { count: total },
      { count: active },
      { count: expiring },
      { count: expired },
      { data: allPayments },
      { data: payments30d },
      { count: todayAtt },
      { data: expiringRaw },
      { data: recentRaw },
    ] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }).eq('gym_id', gym!.id),
      supabase.from('members').select('*', { count: 'exact', head: true }).eq('gym_id', gym!.id).gte('expiry_date', todayStr),
      supabase.from('members').select('*', { count: 'exact', head: true }).eq('gym_id', gym!.id).gte('expiry_date', todayStr).lte('expiry_date', in7Days),
      supabase.from('members').select('*', { count: 'exact', head: true }).eq('gym_id', gym!.id).lt('expiry_date', todayStr),
      supabase.from('payments').select('amount').eq('gym_id', gym!.id),
      supabase.from('payments').select('amount, payment_date').eq('gym_id', gym!.id).gte('payment_date', days30ago).order('payment_date'),
      // Fixed: attendance status is 'P' not 'present'
      supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('gym_id', gym!.id).eq('date', todayStr).eq('status', 'P'),
      supabase.from('members').select('id, name, phone, plan_name, expiry_date').eq('gym_id', gym!.id).gte('expiry_date', todayStr).lte('expiry_date', in7Days).order('expiry_date'),
      supabase.from('members').select('id, name, plan_name, join_date, photo_url').eq('gym_id', gym!.id).order('join_date', { ascending: false }).limit(5),
    ])
 
    const totalRevenue = allPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0
    const revenue30dTotal = payments30d?.reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0
 
    // Build 30-day revenue chart — one point per day
    const dayMap: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = d.toISOString().split('T')[0]
      dayMap[key] = 0
    }
    payments30d?.forEach(p => {
      const key = p.payment_date?.split('T')[0]
      if (key && dayMap[key] !== undefined) dayMap[key] += p.amount || 0
    })
    const chart: ChartPoint[] = Object.entries(dayMap).map(([date, revenue]) => ({
      day: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      revenue,
    }))
    setChartData(chart)
 
    // Expiring members with days left
    const expMembers: ExpiringMember[] = (expiringRaw ?? []).map(m => ({
      id: m.id, name: m.name, phone: m.phone,
      plan_name: m.plan_name, expiry_date: m.expiry_date,
      daysLeft: Math.ceil((new Date(m.expiry_date).getTime() - today.getTime()) / 86400000),
    }))
 
    setStats({
      totalMembers: total ?? 0,
      activeMembers: active ?? 0,
      expiringSoon: expiring ?? 0,
      expired: expired ?? 0,
      totalRevenue,
      revenue30d: revenue30dTotal,
      todayAttendance: todayAtt ?? 0,
    })
    setExpiringMembers(expMembers)
    setRecentMembers(recentRaw ?? [])
    setLoading(false)
  }
 
  const currency = gym?.currency?.split(' ')[0] ?? '₹'
 
  const cards = [
    { label: 'Total Members', value: stats.totalMembers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', path: '/members' },
    { label: 'Active Members', value: stats.activeMembers, icon: UserCheck, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', path: '/members' },
    { label: 'Expiring in 7d', value: stats.expiringSoon, icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', path: '/renewals' },
    { label: 'Expired', value: stats.expired, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', path: '/renewals' },
    { label: '30-Day Revenue', value: `${currency}${stats.revenue30d.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-[#E8593C]', bg: 'bg-orange-50 dark:bg-orange-900/20', tag: 'Last 30 days' },
    { label: 'Total Revenue', value: `${currency}${stats.totalRevenue.toLocaleString('en-IN')}`, icon: Wallet, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', tag: 'All time' },
    { label: "Today's Attendance", value: stats.todayAttendance, icon: CalendarCheck, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20', path: '/attendance' },
    { label: 'Pending Renewals', value: stats.expiringSoon + stats.expired, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', path: '/renewals' },
  ]
 
  const quickActions = [
    { label: 'Add Member', emoji: '👤', path: '/members/add' },
    { label: 'Attendance', emoji: '✅', path: '/attendance' },
    { label: 'Renewals', emoji: '🔔', path: '/renewals' },
    { label: 'Add Lead', emoji: '💬', path: '/inquiries' },
  ]
 
  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-8 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 animate-pulse border border-gray-100 dark:border-gray-700">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl mb-3" />
              <div className="h-7 bg-gray-100 dark:bg-gray-700 rounded w-16 mb-2" />
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }
 
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
 
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back 👋</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {gym?.name ?? 'Your gym'} <span className="text-[#E8593C]">at a glance</span>
          </h1>
        </div>
        <button
          onClick={fetchAll}
          className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>
 
      {/* Empty state */}
      {stats.totalMembers === 0 && (
        <div className="bg-gradient-to-r from-[#E8593C]/10 to-orange-50 dark:from-[#E8593C]/10 dark:to-orange-900/10 border border-[#E8593C]/20 rounded-2xl p-6 text-center">
          <p className="text-2xl mb-2">🏋️</p>
          <p className="font-semibold text-gray-800 dark:text-white">Start by adding your first member!</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your dashboard stats will appear here once you add members.</p>
          <button
            onClick={() => navigate('/members/add')}
            className="inline-block mt-4 bg-gradient-to-r from-[#E8593C] to-[#d44025] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:shadow-lg transition-all"
          >
            + Add First Member
          </button>
        </div>
      )}
 
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            onClick={() => card.path && navigate(card.path)}
            className={`bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-5 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all ${card.path ? 'cursor-pointer hover:border-[#E8593C]/30' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center`}>
                <card.icon className={card.color} size={20} />
              </div>
              {card.tag && (
                <span className="text-[10px] text-[#E8593C] font-medium bg-[#E8593C]/10 px-1.5 py-0.5 rounded-full">{card.tag}</span>
              )}
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>
 
      {/* Revenue Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Revenue — Last 30 Days</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {currency}{stats.revenue30d.toLocaleString('en-IN')} collected
            </p>
          </div>
        </div>
        {chartData.every(d => d.revenue === 0) ? (
          <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
            No payment data in the last 30 days
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E8593C" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#E8593C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              />
              <Tooltip
                formatter={(v: number) => [`${currency}${v.toLocaleString('en-IN')}`, 'Revenue']}
                contentStyle={{
                  borderRadius: '12px', border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#E8593C"
                strokeWidth={2.5}
                fill="url(#revenueGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#E8593C' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
 
      {/* Bottom two-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 
        {/* Expiring Soon */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-500" /> Expiring Soon
            </h2>
            <button
              onClick={() => navigate('/renewals')}
              className="text-xs text-[#E8593C] font-medium flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
 
          {expiringMembers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">No members expiring in the next 7 days!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringMembers.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${avatarColor(m.name)} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                    {initials(m.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.plan_name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.daysLeft === 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : m.daysLeft <= 3 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500'
                    }`}>
                      {m.daysLeft === 0 ? 'Today' : `${m.daysLeft}d`}
                    </span>
                    <a
                      href={`https://wa.me/91${m.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${m.name.split(' ')[0]}! Your ${gym?.name ?? 'gym'} membership expires in ${m.daysLeft} day${m.daysLeft !== 1 ? 's' : ''}. Renew now to keep going! 💪`)}`}
                      target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 transition-colors"
                    >
                      <MessageCircle size={13} />
                    </a>
                    <a
                      href={`tel:${m.phone}`}
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      <Phone size={13} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
 
        {/* Recent Members + Quick Actions */}
        <div className="space-y-4">
 
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="font-bold text-gray-900 dark:text-white mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(action => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-[#E8593C]/30 hover:bg-[#E8593C]/5 transition-all text-left group"
                >
                  <span className="text-xl">{action.emoji}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#E8593C] transition-colors">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
 
          {/* Recent Members */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 dark:text-white">Recent Members</h2>
              <button
                onClick={() => navigate('/members')}
                className="text-xs text-[#E8593C] font-medium flex items-center gap-1 hover:underline"
              >
                View all <ArrowRight size={12} />
              </button>
            </div>
            {recentMembers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No members yet</p>
            ) : (
              <div className="space-y-3">
                {recentMembers.map(m => (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/members/${m.id}`)}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-2 px-2 py-1 rounded-xl transition-colors"
                  >
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className={`w-9 h-9 rounded-full ${avatarColor(m.name)} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                        {initials(m.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.plan_name}</p>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(m.join_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
 
        </div>
      </div>
    </div>
  )
}
 