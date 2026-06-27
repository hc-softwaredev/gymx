import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://grnmtxfetraqolwlawtd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdybm10eGZldHJhcW9sd2xhd3RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTc3NTksImV4cCI6MjA5Nzg5Mzc1OX0.BKIVjrbAEb5F5I9s44ombP2ld604Mzb3H8Zlm6lfspY'
)