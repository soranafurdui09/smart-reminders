// lib/supabase/server.ts
import { cookies } from 'next/headers'
import {
  createServerClient as createSupabaseServerClient,
  type CookieOptions,
} from '@supabase/ssr'

export function createServerClient() {
  const cookieStore = cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // IMPORTANT: nu chemăm response.cookies.set aici,
          // ci folosim cookieStore -> Next știe să le trimită înapoi
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          })
        },
      },
    }
  )
}
