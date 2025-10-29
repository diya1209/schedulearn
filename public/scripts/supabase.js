import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://dzciwhdyzlcdpggfzyjx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6Y2l3aGR5emxjZHBnZ2Z6eWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDc0NTcsImV4cCI6MjA3NzMyMzQ1N30.S3Q9lYIFg2mmJOx6enUphIC83QiBsieeDffBMC-Oz34';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function checkAuth() {
  const user = await getCurrentUser();
  return user !== null;
}
