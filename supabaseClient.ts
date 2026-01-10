import { createClient } from '@supabase/supabase-js';

// These environment variables must be set in your .env file or deployment settings
const supabaseUrl = "https://tckxjyqtifbvkucjtiuk.supabase.co" 
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRja3hqeXF0aWZidmt1Y2p0aXVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNjU0NzIsImV4cCI6MjA4MzY0MTQ3Mn0.db1750isqZguYlM-p8V8nPSVJyUOqnKQsQxwWJ_ZSwU"
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
