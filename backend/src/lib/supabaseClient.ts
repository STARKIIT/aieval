import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Lazy initialization so it doesn't fail if variables are missing
export const getSupabaseClient = () => {
  if (!supabaseUrl) return null;
  
  // Prefer Service Role Key on the backend for administrative operations (bypasses RLS for API-driven queries)
  const activeKey = supabaseServiceKey || supabaseAnonKey;
  if (!activeKey || activeKey === 'your_anon_key_here') {
    return null;
  }
  return createClient(supabaseUrl, activeKey, {
    auth: {
      persistSession: false // Server environment does not persist session
    }
  });
};
