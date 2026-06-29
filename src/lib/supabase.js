import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rbtjhqbmlwiecebkryfa.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidGpocWJtbHdpZWNlYmtyeWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MTY5NjIsImV4cCI6MjA5ODI5Mjk2Mn0.q3RgQvMFUdtIM9efqJHVXPcz4pboFJsZ2k_hKhApC4Y'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const todayISO = () => new Date().toISOString().split('T')[0]

export const getNDaysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
