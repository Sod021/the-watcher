// supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const SUPABASE_URL = 'https://sdzkcahbnuzptjinzuqq.supabase.co'; // <-- replace
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkemtjYWhibnV6cHRqaW56dXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjM3MTEsImV4cCI6MjA3ODU5OTcxMX0.Z0BltEOnyo58oCit0Abl1bjNLilPWvElA_6MSbMyfcA'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
