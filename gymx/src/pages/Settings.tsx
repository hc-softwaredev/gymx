import { useEffect, useState } from 'react'
import { Save, Upload, Building2, Clock, Palette, Phone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useGymStore } from '../store/gymStore'

const CURRENCIES = ['₹ (INR)', '$ (USD)', '£ (GBP)', '€ (EUR)', 'AED', 'SGD']
const BRAND_COLORS = ['#E8593C', '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']

export default function Settings() {
  const gym = useGymStore(state => state.gym)
  const setGym = useGymStore(state => state.setGym)
  const [form, setForm] = useState({
    name: '', owner_name: '', phone: '', address: '', city: '',
    currency: '₹ (INR)', gst_percent: '18',
    male_morning: '6:00 AM', male_evening: '11:00 AM',
    female_morning: '5:00 PM', female_evening: '9:00 PM',
    brand_color: '#E8593C',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (gym) {
      setForm({
        name: gym.name ?? '',
        owner_name: gym.owner_name ?? '',
        phone: gym.phone ?? '',
        address: gym.address ?? '',
        city: gym.city ?? '',
        currency: gym.currency ?? '₹ (INR)',
        gst_percent: String(gym.gst_percent ?? 18),
        male_morning: gym.male_morning ?? '6:00 AM',
        male_evening: gym.male_evening ?? '11:00 AM',
        female_morning: gym.female_morning ?? '5:00 PM',
        female_evening: gym.female_evening ?? '9:00 PM',
        brand_color: gym.brand_color ?? '#E8593C',
      })
      if (gym.logo_url) setLogoPreview(gym.logo_url)
    }
  }, [gym])

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function save() {
    if (!gym?.id) return
    setSaving(true)
    let logo_url = gym.logo_url

    if (logoFile) {
      setUploading(true)
      const ext = logoFile.name.split('.').pop()
      const path = `gym-logos/${gym.id}.${ext}`
      const { error } = await supabase.storage.from('logos').upload(path, logoFile, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('logos').getPublicUrl(path)
        logo_url = data.publicUrl
      }
      setUploading(false)
    }

    const payload = {
      ...form,
      gst_percent: parseFloat(form.gst_percent) || 0,
      logo_url,
    }

    await supabase.from('gyms').update(payload).eq('id', gym.id)
    setGym({ ...gym, ...payload })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function field(label: string, key: keyof typeof form, type = 'text', placeholder = '') {
    return (
      <div key={key}>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
        />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gym profile & configuration</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            saved ? 'bg-green-500 text-white' : 'bg-[#E8593C] hover:bg-[#d44e33] text-white'
          }`}
        >
          <Save size={15} />
          {uploading ? 'Uploading...' : saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Logo */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Building2 size={15} className="text-[#E8593C]" /> Gym Logo
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 size={24} className="text-gray-300" />
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                <Upload size={14} /> Upload Logo
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
              <p className="text-xs text-gray-400 mt-1.5">PNG or JPG, max 2MB</p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Building2 size={15} className="text-[#E8593C]" /> Gym Details
          </h2>
          <div className="space-y-3">
            {field('Gym Name', 'name', 'text', 'Your gym name')}
            {field('Owner Name', 'owner_name', 'text', 'Owner full name')}
            {field('Phone', 'phone', 'tel', '10-digit mobile')}
            {field('Address', 'address', 'text', 'Street address')}
            {field('City', 'city', 'text', 'City')}
          </div>
        </div>

        {/* Timings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Clock size={15} className="text-[#E8593C]" /> Shift Timings
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Morning Start', key: 'male_morning' as const },
              { label: 'Morning End', key: 'male_evening' as const },
              { label: 'Evening Start', key: 'female_morning' as const },
              { label: 'Evening End', key: 'female_evening' as const },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
                <input
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder="e.g. 6:00 AM"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Finance */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Phone size={15} className="text-[#E8593C]" /> Finance
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Currency</label>
              <select
                value={form.currency}
                onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
              >
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">GST %</label>
              <input
                type="number"
                value={form.gst_percent}
                onChange={e => setForm(p => ({ ...p, gst_percent: e.target.value }))}
                placeholder="18"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#E8593C]"
              />
            </div>
          </div>
        </div>

        {/* Brand color */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Palette size={15} className="text-[#E8593C]" /> Brand Color
          </h2>
          <div className="flex flex-wrap gap-3">
            {BRAND_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setForm(p => ({ ...p, brand_color: color }))}
                style={{ backgroundColor: color }}
                className={`w-9 h-9 rounded-full transition-transform hover:scale-110 ${
                  form.brand_color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                }`}
              />
            ))}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.brand_color}
                onChange={e => setForm(p => ({ ...p, brand_color: e.target.value }))}
                className="w-9 h-9 rounded-full cursor-pointer border-0 bg-transparent"
              />
              <span className="text-xs text-gray-400">Custom</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
