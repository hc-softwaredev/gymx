import { create } from 'zustand'
import { supabase } from '../lib/supabase'

interface Gym {
  id: string
  name: string
  owner_name: string
  phone: string
  address: string
  city: string
  logo_url: string
  currency: string
  gst_percent: number
  brand_color: string
  male_morning: string
  male_evening: string
  female_morning: string
  female_evening: string
}

interface User {
  id: string
  email: string
}

interface GymStore {
  user: User | null
  gym: Gym | null
  darkMode: boolean
  setUser: (user: User | null) => void
  setGym: (gym: Gym | null) => void
  toggleDarkMode: () => void
  fetchGym: (userId: string) => Promise<void>
  logout: () => Promise<void>
}

export const useGymStore = create<GymStore>((set) => ({
  user: null,
  gym: null,
  darkMode: false,

  setUser: (user) => set({ user }),
  setGym: (gym) => set({ gym }),

  toggleDarkMode: () =>
    set((state) => {
      const newMode = !state.darkMode
      if (newMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return { darkMode: newMode }
    }),

  fetchGym: async (userId) => {
    const { data } = await supabase
      .from('gyms')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (data) set({ gym: data })
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, gym: null })
  },
}))