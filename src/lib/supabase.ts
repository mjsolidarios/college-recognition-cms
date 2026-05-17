import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

export function getSupabaseConfigError(): string | null {
  if (isSupabaseConfigured()) {
    return null
  }
  return 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and add your project credentials.'
}

export type CmsDocumentRow = {
  id: string
  slug: string
  document_title: string
  pages: unknown
  settings: unknown
  front_cover: string | null
  back_cover: string | null
  updated_at: string
}

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.')
  }
  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey!)
  }
  return client
}
