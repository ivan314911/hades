import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ylndezykqukcmzjgyhar.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsbmRlenlrcXVrY216amd5aGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNzQ0NTQsImV4cCI6MjA5MDk1MDQ1NH0.gb0ZK-KD6q73DDRFC9-8QJI-x-yQV9-aqJf-IfNMqxg'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey)
