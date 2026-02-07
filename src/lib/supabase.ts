import { createClient } from '@supabase/supabase-js';
import { config } from './config';

export const supabase = createClient(config.supabaseUrl, config.supabaseKey);

export async function saveUser(user: {
  id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  is_bot: boolean;
  language_code?: string;
}) {
  const { error } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      is_bot: user.is_bot,
      language_code: user.language_code,
      updated_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error("Error saving user:", error);
  }
}

export async function updateUserAuth(userId: number, isAuthenticated: boolean) {
  const { error } = await supabase
    .from('users')
    .update({ is_authenticated: isAuthenticated })
    .eq('id', userId);

  if (error) console.error("Error updating user auth:", error);
}

export async function isUserAuthenticated(userId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('is_authenticated')
    .eq('id', userId)
    .single();

  if (error) {
    console.error("Error checking user auth:", error);
    return false;
  }
  return data?.is_authenticated || false;
}


