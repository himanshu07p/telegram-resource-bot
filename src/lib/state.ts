import { supabase } from './supabase';

export type UserState = 'IDLE' | 'AWAITING_METADATA';

export interface UserStateData {
  user_id: number;
  state: UserState;
  pending_file_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get current state for a user
 */
export async function getUserState(userId: number): Promise<UserStateData | null> {
  const { data, error } = await supabase
    .from('user_states')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No state found, return default IDLE
      return {
        user_id: userId,
        state: 'IDLE'
      };
    }
    console.error('Error fetching user state:', error);
    return null;
  }

  return data as UserStateData;
}

/**
 * Set user state
 */
export async function setUserState(
  userId: number,
  state: UserState,
  pendingFileId?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('user_states')
    .upsert({
      user_id: userId,
      state,
      pending_file_id: pendingFileId,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error setting user state:', error);
    return false;
  }

  return true;
}

/**
 * Clear user state (reset to IDLE)
 */
export async function clearUserState(userId: number): Promise<boolean> {
  return setUserState(userId, 'IDLE', undefined);
}

/**
 * Parse metadata from user input text
 * Format:
 *   name: Physics Book
 *   author: HC Verma
 *   subject: Physics
 *   exam: JEE
 *   year: 2024
 *   edition: 5th
 *   semester: 1st Sem
 */
export function parseMetadataInput(text: string): {
  title?: string;
  author?: string;
  subject?: string;
  exam?: string;
  year?: number;
  edition?: string;
  semester?: string;
} {
  const metadata: any = {};
  
  // Split by lines and parse each line
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(':')) continue;
    
    const [rawKey, ...valueParts] = trimmed.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = valueParts.join(':').trim();
    
    if (!value) continue;
    
    // Map common variations to standard fields
    switch (key) {
      case 'name':
      case 'title':
      case 'document':
      case 'doc':
        metadata.title = value;
        break;
      
      case 'author':
      case 'writer':
      case 'by':
        metadata.author = value;
        break;
      
      case 'subject':
      case 'topic':
      case 'course':
      case 'genre': // Map genre to subject
        metadata.subject = value;
        break;
      
      case 'exam':
      case 'test':
      case 'examination':
        metadata.exam = value;
        break;
      
      case 'year':
      case 'yr':
        const yearNum = parseInt(value);
        if (!isNaN(yearNum)) {
          metadata.year = yearNum;
        }
        break;
      
      case 'edition':
      case 'ed':
      case 'version':
        metadata.edition = value;
        break;
      
      case 'semester':
      case 'sem':
      case 'term':
        metadata.semester = value;
        break;
    }
  }
  
  return metadata;
}
