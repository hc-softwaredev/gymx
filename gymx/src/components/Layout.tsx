import { useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useGymStore } from '../store/gymStore'
import Dashboard from '../pages/Dashboard'
import { useLocation } from 'react-router-dom'
import AddMember from '../pages/AddMember'
import Members from '../pages/Members'
import MemberDetail from '../pages/MemberDetail'
import Attendance from '../pages/Attendance'
import Renewals from '../pages/Renewals'
import Inquiries from '../pages/Inquiries'
import Plans from '../pages/Plans'
import Staff from '../pages/Staff'
import Settings from '../pages/Settings'
import Payments from '../pages/Payments'
import Analytics from '../pages/Analytics'
import Expenses from '../pages/Expenses'
import Reports from '../pages/Reports'
import {
  LayoutDashboard, Users, UserCheck, CalendarCheck,
  RefreshCw, MessageCircle, CreditCard, BarChart2,
  Receipt, Dumbbell, FileText, Settings as SettingsIcon, Menu,
  LogOut, Moon, Sun, Plus, Bell
} from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Members', path: '/members' },
  { icon: UserCheck, label: 'Staff', path: '/staff' },
  { icon: CalendarCheck, label: 'Attendance', path: '/attendance' },
  { icon: RefreshCw, label: 'Renewals', path: '/renewals' },
  { icon: MessageCircle, label: 'Inquiries', path: '/inquiries' },
  { icon: CreditCard, label: 'Payments', path: '/payments' },
  { icon: BarChart2, label: 'Analytics', path: '/analytics' },
  { icon: Receipt, label: 'Expenses', path: '/expenses' },
  { icon: Dumbbell, label: 'Plans', path: '/plans' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: SettingsIcon, label: 'Settings', path: '/settings' },
]

export default function Layout() {
  const { gym, darkMode, toggleDarkMode, logout } = useGymStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className={`flex h-screen bg-gray-50 ${darkMode ? 'dark' : ''}`}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800
        flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Gym Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#E8593C] to-[#d44025] rounded-xl flex items-center justify-center flex-shrink-0">
              <Dumbbell className="text-white" size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-gray-400 font-medium truncate">
                {gym?.name || 'GymX'}
              </p>
              <p className="text-sm font-bold text-gray-800 dark:text-white truncate">
                {gym?.owner_name || 'Owner'}
              </p>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-gradient-to-r from-[#E8593C] to-[#d44025] text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }
              `}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Add Member Button */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => { navigate('/members/add'); setSidebarOpen(false) }}
            className="w-full bg-gradient-to-r from-[#E8593C] to-[#d44025] text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-md transition-all"
          >
            <Plus size={16} />
            Add Member
          </button>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 truncate">{gym?.owner_name || 'demo@gymx.in'}</span>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-800 dark:hover:text-white"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">
              {navItems.find(item =>
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)
              )?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all relative">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#E8593C] rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/add" element={<AddMember />} />
            <Route path="/members/:id" element={<MemberDetail />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/renewals" element={<Renewals />} />
            <Route path="/inquiries" element={<Inquiries />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/settings" element={<Settings />} />
            {/* Your partner's modules — leave as placeholders */}
            <Route path="/payments" element={<Payments />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/expenses" element={<Expenses />} />
           <Route path="/reports" element={<Reports />} />  
          </Routes>
        </main>
      </div>
    </div>
  )
}
