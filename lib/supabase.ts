import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdwahznnkwwlrwdvpaus.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd2Foem5ua3d3bHJ3ZHZwYXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzAwOTIsImV4cCI6MjA4MDkwNjA5Mn0.DhV3w6YT7Asp8tR_ZJbDgItFYBjK3prI_Co_Ob373y8';

// Custom lock function that bypasses the Navigator LockManager
// This prevents the "Acquiring an exclusive Navigator LockManager lock timed out" error
// which is common in iframe and hot-reload development environments.
const customLock = async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
  return await fn();
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    lock: customLock,
  }
});