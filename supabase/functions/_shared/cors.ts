// Shared CORS headers for Supabase Edge Functions
// Sesuaikan `Access-Control-Allow-Origin` dengan domain production Anda.
export const corsHeaders = {
'Access-Control-Allow-Origin': 'https://mansgroup.vercel.app',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}