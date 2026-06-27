import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, X, Phone, Clock, IndianRupee, CheckSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useGymStore } from '../store/gymStore'

interface StaffMember {
  id: string
  gym_id: string
  name: string
  role: string
  phone: string
  salary: number
  shift_start: string
  shift_end: string
  tasks: string | null
  status: string
}

const ROLES = ['Trainer', 'Receptionist', 'Cleaner', 'Manager', 'Security', 'Other']
const DEFAULT_FORM = {
  name: '', role: 'Trainer', phone: '', salary: '',
  shift_start: '06:00', shift_end: '14:00', tasks: '', status: 'Active',
}

const ROLE_COLORS: Record<string, string> = {
  Trainer: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  Receptionist: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  Cleaner: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  Manager: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  Security: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function Staff() {
  const gym = useGymStore(state => state.gym)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (gym?.id) fetchStaff() }, [gym?.id])

  async function fetchStaff() {
    setLoading(true)
    const { data } = await supabase.from('staff').select('*').eq('gym_id', gym!.id).order('name')
    setStaff(data ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setShowModal(true)
  }

  function openEdit(s: StaffMember) {
    setEditingId(s.id)
    setForm({
      name: s.name, role: s.role, phone: s.phone, salary: String(s.salary),
      shift_start: s.shift_start, shift_end: s.shift_end, tasks: s.tasks ?? '', status: s.status,
    })
    setShowModal(true)
  }

  async function saveStaff() {
    if (!form.name || !form.phone) return
    setSaving(true)
    const payload = {
      gym_id: gym!.id,
      name: form.name, role: form.role, phone: form.phone,
      salary: parseFloat(form.salary) || 0,
      shift_start: form.shift_start, shift_end: form.shift_end,
      tasks: form.tasks || null, status: form.status,
    }
    if (editingId) {
      await supabase.from('staff').update(payload).eq('id', editingId)
    } else {
      await supabase.from('staff').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    fetchStaff()
  }

  async function deleteStaff(id: string) {
    if (!confirm('Remove this staff member?')) return
    await supabase.from('staff').delete().eq('id', id)
    setStaff(prev => prev.filter(s => s.id !== id))
  }

  const totalSalary = staff.filter(s => s.status === 'Active').reduce((sum, s) => sum + s.salary, 0)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {staff.filter(s => s.status === 'Active').length} active · Monthly payroll: {gym?.currency ?? '₹'}{totalSalary.toLocaleString()}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#E8593C] hover:bg-[#d44e33] text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse h-36" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 font-medium">No staff added yet</p>
          <button onClick={openAdd} className="mt-3 text-[#E8593C] text-sm font-medium hover:underline">+ Add Staff</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {staff.map(s => (
            <div key={s.id} className={`bg-white dark:bg-gray-800 rounded-2xl border p-4 transition-all ${s.status === 'Inactive' ? 'opacity-60 border-gray-100 dark:border-gray-700' : 'border-gray-100 dark:border-gray-700'}`}>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#E8593C] to-[#f07b5e] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {initials(s.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{s.name}</p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${ROLE_COLORS[s.role] ?? ROLE_COLORS.Other}`}>
                        {s.role}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => deleteStaff(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Phone size={11} className="flex-shrink-0" />
                  <a href={`tel:${s.phone}`} className="hover:text-[#E8593C]">{s.phone}</a>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock size={11} className="flex-shrink-0" />
                  <span>{s.shift_start} – {s.shift_end}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <IndianRupee size={11} className="flex-shrink-0" />
                  <span>{gym?.currency ?? '₹'}{s.salary.toLocaleString()} / month</span>
                </div>
                {s.tasks && (
                  <div className="flex items-start gap-2 text-xs text-gray-500">
                    <CheckSquare size={11} className="flex-shrink-0 mt-0.5" />
                    <span>{s.tasks}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">{editingId ? 'Edit Staff' : 'Add Staff'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Full Name *', key: 'name', placeholder: 'Staff name' },
                { label: 'Phone *', key: 'phone', placeholder: '10-digit mobile' },
                { label: 'Salary (₹/month)', key: 'salary', placeholder: '0', type: 'number' },
                { label: 'Tasks / Responsibilities', key: 'tasks', placeholder: 'e.g. Train morning batch, clean equipment' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{f.label}</label>
                  <input
                    type={f.type ?? 'text'}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                  />
                </div>
              ))}

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Role</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      onClick={() => setForm(p => ({ ...p, role: r }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        form.role === r ? 'bg-[#E8593C] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Shift Start</label>
                  <input
                    type="time"
                    value={form.shift_start}
                    onChange={e => setForm(p => ({ ...p, shift_start: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Shift End</label>
                  <input
                    type="time"
                    value={form.shift_end}
                    onChange={e => setForm(p => ({ ...p, shift_end: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Status</label>
                <div className="flex gap-2">
                  {['Active', 'Inactive'].map(st => (
                    <button
                      key={st}
                      onClick={() => setForm(p => ({ ...p, status: st }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                        form.status === st ? 'bg-[#E8593C] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={saveStaff}
                disabled={!form.name || !form.phone || saving}
                className="w-full py-3 bg-[#E8593C] text-white rounded-xl font-semibold text-sm hover:bg-[#d44e33] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
