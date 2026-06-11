import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/**
 * Lazy-initialized Supabase client.
 * This prevents the app from crashing on boot if environment variables are missing.
 * It will only throw an error when the app actually tries to use the client.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!client) {
      if (
        !supabaseUrl ||
        !supabaseAnonKey ||
        supabaseUrl.includes("your-project-id")
      ) {
        throw new Error(
          "Supabase configuration missing or placeholder detected. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment secrets."
        );
      }

      // Strict validation and cleaning for environment variables
      const cleanUrl = (supabaseUrl || "").trim().replace(/['"]/g, "");
      const cleanKey = (supabaseAnonKey || "").trim().replace(/['"]/g, "");

      if (!cleanUrl.startsWith("https://")) {
        throw new Error(
          "Invalid Supabase URL format. It should start with https://"
        );
      }

      client = createClient(cleanUrl, cleanKey);
    }
    return (client as any)[prop];
  },
});

export const isSupabaseConfigured = () => {
  return (
    !!supabaseUrl &&
    !!supabaseAnonKey &&
    !supabaseUrl.includes("your-project-id")
  );
};
