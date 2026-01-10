import { createClient } from '@supabase/supabase-js';

// These environment variables must be set in your .env file or deployment settings
const supabaseUrl = "https://ojduzzmiyihgeuzoiynm.supabase.co" 
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZHV6em1peWloZ2V1em9peW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzI4NjAsImV4cCI6MjA4MzQ0ODg2MH0.d75bRPq_dxPAAIEY0KmIEAgjbaB5-wPp1HLVhuiX2MY"
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
