import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// 🔥 ENV DEBUG (optional, remove in production)
console.log("ENV:", import.meta.env);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

// ❌ STOP APP IF ENV MISSING
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Supabase ENV not loaded properly");
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);