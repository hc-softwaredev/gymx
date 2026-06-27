import { useEffect, useState } from 'react'
import {
  FileText, Download, FileSpreadsheet,
  Users, CreditCard, Receipt, CalendarCheck,
  ChevronDown, Loader2, CheckCircle2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useGymStore } from '../store/gymStore'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
 
type ReportType = 'members' | 'payments' | 'expenses' | 'attendance'
type ExportFormat = 'pdf' | 'csv'
 
interface DateRange {
  from: string
  to: string
}
 
const REPORT_CONFIG = {
  members: {
    label: 'Members Report',
    icon: Users,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    description: 'All members with plan, status, expiry date',
  },
  payments: {
    label: 'Payments Report',
    icon: CreditCard,
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
    description: 'Payment history with member, amount, mode',
  },
  expenses: {
    label: 'Expenses Report',
    icon: Receipt,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    description: 'All expenses by category with totals',
  },
  attendance: {
    label: 'Attendance Report',
    icon: CalendarCheck,
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    description: 'Daily attendance with present/absent count',
  },
}
 
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
 
function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
 
export default function Reports() {
  const gym = useGymStore(state => state.gym)
  const currency = gym?.currency?.split(' ')[0] ?? '₹'
 
  const [reportType, setReportType] = useState<ReportType>('members')
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
 
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
 
  const [dateRange, setDateRange] = useState<DateRange>({ from: firstOfMonth, to: today })
  const [statusFilter, setStatusFilter] = useState('All') // for members
  const [shiftFilter, setShiftFilter] = useState('All')   // for attendance
 
  // Load preview whenever type or filters change
  useEffect(() => { if (gym?.id) loadPreview() }, [gym?.id, reportType, dateRange, statusFilter, shiftFilter])
 
  async function fetchData() {
    const { from, to } = dateRange
 
    if (reportType === 'members') {
      const query = supabase.from('members').select('name, phone, gender, plan_name, plan_duration_months, join_date, expiry_date').eq('gym_id', gym!.id).order('name')
      const { data } = await query
      const filtered = (data ?? []).filter(m => {
        if (statusFilter === 'Active') return m.expiry_date >= today
        if (statusFilter === 'Expired') return m.expiry_date < today
        if (statusFilter === 'Expiring') {
          const diff = Math.ceil((new Date(m.expiry_date).getTime() - Date.now()) / 86400000)
          return diff >= 0 && diff <= 7
        }
        return true
      })
      return {
        headers: ['Name', 'Phone', 'Gender', 'Plan', 'Duration', 'Join Date', 'Expiry Date', 'Status'],
        rows: filtered.map(m => {
          const days = Math.ceil((new Date(m.expiry_date).getTime() - Date.now()) / 86400000)
          const status = days < 0 ? 'Expired' : days <= 7 ? 'Expiring' : 'Active'
          return [m.name, m.phone, m.gender ?? '', m.plan_name, `${m.plan_duration_months}mo`, formatDate(m.join_date), formatDate(m.expiry_date), status]
        }),
        summary: `Total: ${filtered.length} members`,
      }
    }
 
    if (reportType === 'payments') {
      const { data } = await supabase.from('payments').select('member_name, plan_name, amount, discount, payment_mode, payment_date, notes')
        .eq('gym_id', gym!.id).gte('payment_date', from).lte('payment_date', to).order('payment_date', { ascending: false })
      const total = (data ?? []).reduce((s, p) => s + (p.amount || 0), 0)
      return {
        headers: ['Member', 'Plan', 'Amount', 'Discount', 'Mode', 'Date', 'Notes'],
        rows: (data ?? []).map(p => [p.member_name, p.plan_name, `${currency}${p.amount}`, p.discount > 0 ? `${currency}${p.discount}` : '-', p.payment_mode, formatDate(p.payment_date), p.notes ?? '']),
        summary: `Total Revenue: ${currency}${total.toLocaleString('en-IN')} · ${data?.length ?? 0} transactions`,
      }
    }
 
    if (reportType === 'expenses') {
      const { data } = await supabase.from('expenses').select('title, amount, category, payment_mode, expense_date, notes')
        .eq('gym_id', gym!.id).gte('expense_date', from).lte('expense_date', to).order('expense_date', { ascending: false })
      const total = (data ?? []).reduce((s, e) => s + (e.amount || 0), 0)
      return {
        headers: ['Title', 'Amount', 'Category', 'Mode', 'Date', 'Notes'],
        rows: (data ?? []).map(e => [e.title, `${currency}${e.amount}`, e.category, e.payment_mode, formatDate(e.expense_date), e.notes ?? '']),
        summary: `Total Expenses: ${currency}${total.toLocaleString('en-IN')} · ${data?.length ?? 0} records`,
      }
    }
 
    if (reportType === 'attendance') {
      const query = supabase.from('attendance').select('date, shift, status, member_id')
        .eq('gym_id', gym!.id).gte('date', from).lte('date', to).order('date', { ascending: false })
      const { data: attData } = await query
 
      // Group by date
      const dayMap: Record<string, { morning_p: number; morning_a: number; evening_p: number; evening_a: number }> = {}
      ;(attData ?? []).forEach(a => {
        if (!dayMap[a.date]) dayMap[a.date] = { morning_p: 0, morning_a: 0, evening_p: 0, evening_a: 0 }
        if (a.shift === 'morning') {
          if (a.status === 'P') dayMap[a.date].morning_p++
          else dayMap[a.date].morning_a++
        } else {
          if (a.status === 'P') dayMap[a.date].evening_p++
          else dayMap[a.date].evening_a++
        }
      })
 
      const rows = Object.entries(dayMap)
        .filter(([_, v]) => shiftFilter === 'All' || (shiftFilter === 'morning' ? v.morning_p + v.morning_a > 0 : v.evening_p + v.evening_a > 0))
        .map(([date, v]) => [
          formatDate(date),
          String(v.morning_p), String(v.morning_a),
          String(v.evening_p), String(v.evening_a),
          String(v.morning_p + v.evening_p),
        ])
 
      const totalPresent = rows.reduce((s, r) => s + parseInt(r[5] || '0'), 0)
      return {
        headers: ['Date', 'Morning Present', 'Morning Absent', 'Evening Present', 'Evening Absent', 'Total Present'],
        rows,
        summary: `Total Present Entries: ${totalPresent} · ${rows.length} days`,
      }
    }
 
    return { headers: [], rows: [], summary: '' }
  }
 
  async function loadPreview() {
    setPreviewLoading(true)
    const data = await fetchData()
    setPreview({ headers: data.headers, rows: data.rows.slice(0, 5) })
    setPreviewLoading(false)
  }
 
  async function handleExport() {
    setLoading(true)
    setSuccess(false)
    const data = await fetchData()
    const { headers, rows, summary } = data
    const filename = `${gym?.name ?? 'GymX'}_${REPORT_CONFIG[reportType].label.replace(' ', '_')}_${dateRange.from}_to_${dateRange.to}`
 
    if (format === 'csv') {
      downloadCSV(`${filename}.csv`, headers, rows)
    } else {
      // PDF
      const doc = new jsPDF()
 
      // Header
      doc.setFillColor(232, 89, 60)
      doc.rect(0, 0, 210, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(gym?.name ?? 'GymX', 14, 12)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(REPORT_CONFIG[reportType].label, 14, 20)
      doc.text(`Generated: ${formatDate(today)}`, 140, 12)
      if (reportType !== 'members') {
        doc.text(`Period: ${formatDate(dateRange.from)} – ${formatDate(dateRange.to)}`, 140, 20)
      }
 
      // Summary
      doc.setTextColor(100, 100, 100)
      doc.setFontSize(9)
      doc.text(summary ?? '', 14, 36)
 
      // Table
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 42,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [232, 89, 60], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [253, 245, 243] },
        margin: { left: 14, right: 14 },
      })
 
      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(180, 180, 180)
        doc.text(`${gym?.name ?? 'GymX'} · Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 8)
      }
 
      doc.save(`${filename}.pdf`)
    }
 
    setLoading(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }
 
  const config = REPORT_CONFIG[reportType]
 
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Export data as PDF or CSV</p>
      </div>
 
      {/* Report type selector */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {(Object.entries(REPORT_CONFIG) as [ReportType, typeof REPORT_CONFIG.members][]).map(([type, cfg]) => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
              reportType === type
                ? 'border-[#E8593C] bg-[#E8593C]/5 shadow-sm'
                : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-200'
            }`}
          >
            <div className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <cfg.icon size={18} className={cfg.color} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${reportType === type ? 'text-[#E8593C]' : 'text-gray-900 dark:text-white'}`}>
                {cfg.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{cfg.description}</p>
            </div>
          </button>
        ))}
      </div>
 
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</h2>
 
        {/* Date range — not for members */}
        {reportType !== 'members' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">From</label>
              <input
                type="date"
                value={dateRange.from}
                max={dateRange.to}
                onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">To</label>
              <input
                type="date"
                value={dateRange.to}
                min={dateRange.from}
                max={today}
                onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
              />
            </div>
          </div>
        )}
 
        {/* Quick date presets */}
        {reportType !== 'members' && (
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'This Month', from: firstOfMonth, to: today },
              { label: 'Last 30d', from: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], to: today },
              { label: 'Last 90d', from: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0], to: today },
              { label: 'This Year', from: `${new Date().getFullYear()}-01-01`, to: today },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => setDateRange({ from: preset.from, to: preset.to })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  dateRange.from === preset.from && dateRange.to === preset.to
                    ? 'bg-[#E8593C] text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
 
        {/* Members status filter */}
        {reportType === 'members' && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Status</p>
            <div className="flex gap-2">
              {['All', 'Active', 'Expiring', 'Expired'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === s ? 'bg-[#E8593C] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
 
        {/* Attendance shift filter */}
        {reportType === 'attendance' && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Shift</p>
            <div className="flex gap-2">
              {[{ label: 'Both', value: 'All' }, { label: 'Morning', value: 'morning' }, { label: 'Evening', value: 'evening' }].map(s => (
                <button
                  key={s.value}
                  onClick={() => setShiftFilter(s.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    shiftFilter === s.value ? 'bg-[#E8593C] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
 
      {/* Format selector */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Export Format</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setFormat('pdf')}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              format === 'pdf' ? 'border-[#E8593C] bg-[#E8593C]/5' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${format === 'pdf' ? 'bg-[#E8593C]' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <FileText size={18} className={format === 'pdf' ? 'text-white' : 'text-red-500'} />
            </div>
            <div className="text-left">
              <p className={`text-sm font-semibold ${format === 'pdf' ? 'text-[#E8593C]' : 'text-gray-900 dark:text-white'}`}>PDF</p>
              <p className="text-xs text-gray-400">Printable report</p>
            </div>
          </button>
          <button
            onClick={() => setFormat('csv')}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              format === 'csv' ? 'border-[#E8593C] bg-[#E8593C]/5' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${format === 'csv' ? 'bg-[#E8593C]' : 'bg-green-50 dark:bg-green-900/20'}`}>
              <FileSpreadsheet size={18} className={format === 'csv' ? 'text-white' : 'text-green-500'} />
            </div>
            <div className="text-left">
              <p className={`text-sm font-semibold ${format === 'csv' ? 'text-[#E8593C]' : 'text-gray-900 dark:text-white'}`}>CSV</p>
              <p className="text-xs text-gray-400">Open in Excel</p>
            </div>
          </button>
        </div>
      </div>
 
      {/* Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Preview <span className="text-gray-400 font-normal">(first 5 rows)</span>
        </h2>
        {previewLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-[#E8593C] animate-spin" />
          </div>
        ) : preview && preview.rows.length > 0 ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {preview.headers.map(h => (
                    <th key={h} className="text-left py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    {row.map((cell, j) => (
                      <td key={j} className="py-2 px-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">No data found for the selected filters</p>
        )}
      </div>
 
      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={loading || !preview || preview.rows.length === 0}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
          success
            ? 'bg-green-500 text-white'
            : 'bg-[#E8593C] hover:bg-[#d44e33] text-white disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Generating...</>
        ) : success ? (
          <><CheckCircle2 size={16} /> Downloaded!</>
        ) : (
          <><Download size={16} /> Export {format.toUpperCase()}</>
        )}
      </button>
    </div>
  )
}