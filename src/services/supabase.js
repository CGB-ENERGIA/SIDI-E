import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  realtime: {
    params: { eventsPerSecond: 10 }
  }
})

// Storage helpers
export const storage = {
  async uploadPhoto (bucket, path, file) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw error
    return data
  },

  getPublicUrl (bucket, path) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  },

  async deletePhoto (bucket, path) {
    const { error } = await supabase.storage.from(bucket).remove([path])
    if (error) throw error
  }
}
