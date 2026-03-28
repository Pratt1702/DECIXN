// Environment configurations
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 
  (isLocalhost ? "http://localhost:8000" : "https://thegangetgenaihackathon.onrender.com");

// Supabase configuration
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";
