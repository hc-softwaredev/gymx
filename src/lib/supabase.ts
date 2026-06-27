import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://grnmtxfetraqolwlawtd.supabase.co'
const supabaseAnonKey = 'sb_publishable_4fhTIwice9uqMqlEAHzZ_g_AhO0nxZL'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  gyms: {
    id: string
    user_id: string
    name: string
    owner_name: string
    phone: string
    address: string
    city: string
    logo_url: string
    currency: string
    gst_percent: number
    male_morning: string
    male_evening: string
    female_morning: string
    female_evening: string
    brand_color: string
    created_at: string
  }
}