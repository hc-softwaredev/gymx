import { useEffect, useState } from 'react'
import {
  TrendingUp, Users, UserCheck, RefreshCw,
  ArrowUp, ArrowDown, Minus, Calendar
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useGymStore } from '../store/gymStore'
 
type Range = '30' | '90' | '180' | '365'
 
interface MonthPoint {
  month: string
  revenue: number
  expenses: number
  profit: number
}
 
interface GrowthPoint {
  month: string
  members: number
  new: number
}
 
interface AttPoint {
  day: string
  present: number
}
 
interface PlanStat {
  name: string
  count: number
  color: string
}
 
const RANGE_LABELS: Record<Range, string> = {
  '30': '30 Days',
  '90': '3 Months',
  '180': '6 Months',
  '365': '1 Year',
}
 
const PIE_COLORS = ['#E8593C', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9']
 
function pct(a: number, b: number) {
  if (b === 0) return 0
  return Math.round(((a - b) / b) * 100)
}
 
function TrendBadge({ value }: { value: number }) {
  if (value === 0) return <span className="flex items-center gap-0.5 text-xs text-gray-400"><Minus size={11} /> 0%</span>
  if (value > 0) return <span className="flex items-center gap-0.5 text-xs text-green-500"><ArrowUp size={11} /> {value}%</span>
  return <span className="flex items-center gap-0.5 text-xs text-red-500"><ArrowDown size={11} /> {Math.abs(value)}%</span>
}
 
export default function Analytics() {
  const gym = useGymStore(state => state.gym)
  const currency = gym?.currency?.split(' ')[0] ?? '₹'
  const [range, setRange] = useState<Range>('90')
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<MonthPoint[]>([])
  const [growthData, setGrowthData] = useState<GrowthPoint[]>([])
  const [attData, setAttData] = useState<AttPoint[]>([])
  const [planStats, setPlanStats] = useState<PlanStat[]>([])
  const [kpis, setKpis] = useState({
    totalRevenue: 0, prevRevenue: 0,
    totalMembers: 0, prevMembers: 0,
    activeMembers: 0,
    retentionRate: 0,
    avgRevPerMember: 0,
    totalExpenses: 0,
    netProfit: 0,
  })
 
  useEffect(() => { if (gym?.id) fetchAll() }, [gym?.id, range])
 
  async function fetchAll() {
    setLoading(true)
    const days = parseInt(range)
    const now = new Date()
    const rangeStart = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    const prevStart = new Date(Date.now() - days * 2 * 86400000).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]
    const att7Start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
 
    const [
      { data: payments },
      { data: expenses },
      { data: members },
      { data: attendance },
    ] = await Promise.all([
      supabase.from('payments').select('amount, payment_date').eq('gym_id', gym!.id).gte('payment_date', prevStart).order('payment_date'),
      supabase.from('expenses').select('amount, expense_date').eq('gym_id', gym!.id).gte('expense_date', prevStart).order('expense_date'),
      supabase.from('members').select('id, plan_name, join_date, expiry_date').eq('gym_id', gym!.id).order('join_date'),
      supabase.from('attendance').select('date, status').eq('gym_id', gym!.id).gte('date', att7Start).order('date'),
    ])
 
    // ── KPIs ──
    const curPays = (payments ?? []).filter(p => p.payment_date >= rangeStart)
    const prevPays = (payments ?? []).filter(p => p.payment_date < rangeStart)
    const totalRevenue = curPays.reduce((s, p) => s + (p.amount || 0), 0)
    const prevRevenue = prevPays.reduce((s, p) => s + (p.amount || 0), 0)
 
    const totalExpenses = (expenses ?? []).filter(e => e.expense_date >= rangeStart).reduce((s, e) => s + (e.amount || 0), 0)
    const netProfit = totalRevenue - totalExpenses
 
    const allMembers = members ?? []
    const totalMembers = allMembers.length
    const activeMembers = allMembers.filter(m => m.expiry_date >= today).length
    const newInRange = allMembers.filter(m => m.join_date >= rangeStart).length
    const newInPrev = allMembers.filter(m => m.join_date >= prevStart && m.join_date < rangeStart).length
 
    // Retention: members who joined before range and are still active
    const joinedBefore = allMembers.filter(m => m.join_date < rangeStart)
    const stillActive = joinedBefore.filter(m => m.expiry_date >= today)
    const retentionRate = joinedBefore.length > 0
      ? Math.round((stillActive.length / joinedBefore.length) * 100)
      : 0
 
    const avgRevPerMember = activeMembers > 0 ? Math.round(totalRevenue / activeMembers) : 0
 
    setKpis({
      totalRevenue, prevRevenue,
      totalMembers, prevMembers: newInPrev,
      activeMembers, retentionRate,
      avgRevPerMember, totalExpenses, netProfit,
    })
 
    // ── Monthly revenue vs expenses ──
    const monthMap: Record<string, { revenue: number; expenses: number }> = {}
    const monthCount = Math.ceil(days / 30)
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7)
      monthMap[key] = { revenue: 0, expenses: 0 }
    }
    ;(payments ?? []).filter(p => p.payment_date >= rangeStart).forEach(p => {
      const key = p.payment_date?.slice(0, 7)
      if (key && monthMap[key] !== undefined) monthMap[key].revenue += p.amount || 0
    })
    ;(expenses ?? []).filter(e => e.expense_date >= rangeStart).forEach(e => {
      const key = e.expense_date?.slice(0, 7)
      if (key && monthMap[key] !== undefined) monthMap[key].expenses += e.amount || 0
    })
    setMonthlyData(Object.entries(monthMap).map(([month, v]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      revenue: v.revenue,
      expenses: v.expenses,
      profit: v.revenue - v.expenses,
    })))
 
    // ── Member growth ──
    const growthMap: Record<string, { members: number; new: number }> = {}
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7)
      growthMap[key] = { members: 0, new: 0 }
    }
    allMembers.forEach(m => {
      const key = m.join_date?.slice(0, 7)
      if (key && growthMap[key] !== undefined) growthMap[key].new++
    })
    // cumulative
    let cumulative = allMembers.filter(m => m.join_date < Object.keys(growthMap)[0] + '-01').length
    const growthArr: GrowthPoint[] = Object.entries(growthMap).map(([month, v]) => {
      cumulative += v.new
      return {
        month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        members: cumulative,
        new: v.new,
      }
    })
    setGrowthData(growthArr)
 
    // ── Attendance last 7 days ──
    const dayMap: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
      dayMap[d] = 0
    }
    ;(attendance ?? []).filter(a => a.status === 'P').forEach(a => {
      if (dayMap[a.date] !== undefined) dayMap[a.date]++
    })
    setAttData(Object.entries(dayMap).map(([date, present]) => ({
      day: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
      present,
    })))
 
    // ── Plan distribution ──
    const planMap: Record<string, number> = {}
    allMembers.forEach(m => {
      const p = m.plan_name ?? 'Unknown'
      planMap[p] = (planMap[p] || 0) + 1
    })
    setPlanStats(Object.entries(planMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count], i) => ({
      name, count, color: PIE_COLORS[i % PIE_COLORS.length],
    })))
 
    setLoading(false)
  }
 
  const revTrend = pct(kpis.totalRevenue, kpis.prevRevenue)
  const memTrend = pct(kpis.totalMembers, kpis.prevMembers)
 
  const kpiCards = [
    {
      label: 'Revenue', value: `${currency}${kpis.totalRevenue.toLocaleString('en-IN')}`,
      sub: `vs ${currency}${kpis.prevRevenue.toLocaleString('en-IN')} prev period`,
      trend: revTrend, icon: TrendingUp, color: 'text-[#E8593C]', bg: 'bg-[#E8593C]/10',
    },
    {
      label: 'Net Profit', value: `${currency}${kpis.netProfit.toLocaleString('en-IN')}`,
      sub: `Expenses: ${currency}${kpis.totalExpenses.toLocaleString('en-IN')}`,
      trend: 0, icon: TrendingUp,
      color: kpis.netProfit >= 0 ? 'text-green-500' : 'text-red-500',
      bg: kpis.netProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: 'Total Members', value: kpis.totalMembers,
      sub: `${kpis.activeMembers} active`,
      trend: memTrend, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Retention Rate', value: `${kpis.retentionRate}%`,
      sub: 'Members still active',
      trend: 0, icon: UserCheck,
      color: kpis.retentionRate >= 70 ? 'text-green-500' : kpis.retentionRate >= 40 ? 'text-yellow-500' : 'text-red-500',
      bg: 'bg-teal-50 dark:bg-teal-900/20',
    },
    {
      label: 'Avg Rev / Member', value: `${currency}${kpis.avgRevPerMember.toLocaleString('en-IN')}`,
      sub: 'Per active member',
      trend: 0, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ]
 
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-1">
            {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  range === r ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          <button onClick={fetchAll} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>
 
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {kpiCards.map(card => (
              <div key={card.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <card.icon size={18} className={card.color} />
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-gray-400 truncate">{card.sub}</p>
                  {card.trend !== 0 && <TrendBadge value={card.trend} />}
                </div>
              </div>
            ))}
          </div>
 
          {/* Revenue vs Expenses chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">Revenue vs Expenses</h2>
                <p className="text-xs text-gray-400 mt-0.5">Monthly comparison</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#E8593C] inline-block" /> Revenue</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-400 inline-block" /> Expenses</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Profit</span>
              </div>
            </div>
            {monthlyData.every(d => d.revenue === 0 && d.expenses === 0) ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip
                    formatter={(v: number, name: string) => [`${currency}${v.toLocaleString('en-IN')}`, name.charAt(0).toUpperCase() + name.slice(1)]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  />
                  <Bar dataKey="revenue" fill="#E8593C" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" fill="#818cf8" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" fill="#34d399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
 
          {/* Member Growth + Attendance row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 
            {/* Member Growth */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
              <div className="mb-4">
                <h2 className="font-bold text-gray-900 dark:text-white">Member Growth</h2>
                <p className="text-xs text-gray-400 mt-0.5">Total & new members per month</p>
              </div>
              {growthData.every(d => d.members === 0) ? (
                <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No member data</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={growthData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="members" stroke="#6366f1" strokeWidth={2.5} fill="url(#memberGrad)" dot={false} name="Total" />
                    <Bar dataKey="new" fill="#E8593C" name="New" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
 
            {/* Attendance last 7 days */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
              <div className="mb-4">
                <h2 className="font-bold text-gray-900 dark:text-white">Attendance — Last 7 Days</h2>
                <p className="text-xs text-gray-400 mt-0.5">Daily check-ins (marked Present)</p>
              </div>
              {attData.every(d => d.present === 0) ? (
                <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No attendance marked yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={attData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(v: number) => [v, 'Present']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    />
                    <Bar dataKey="present" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
 
          {/* Plan Distribution */}
          {planStats.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
              <div className="mb-5">
                <h2 className="font-bold text-gray-900 dark:text-white">Plan Distribution</h2>
                <p className="text-xs text-gray-400 mt-0.5">Members per plan</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={planStats}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {planStats.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, name: string) => [v + ' members', name]}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2.5 w-full">
                  {planStats.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{p.name}</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white ml-2">{p.count}</p>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.round((p.count / (planStats.reduce((s, x) => s + x.count, 0))) * 100)}%`,
                              backgroundColor: p.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}