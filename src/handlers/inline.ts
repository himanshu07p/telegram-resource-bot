import { Context } from 'grammy';
import { InlineQueryResultCachedDocument } from 'grammy/types';
import { supabase } from '../lib/supabase';

/**
 * Handle inline queries for searching all files
 * This allows users to search and share files in any chat
 */
export async function handleInlineQuery(ctx: Context) {
  if (!ctx.inlineQuery) return;
  
  const query = ctx.inlineQuery.query.trim();

  // If no query, show recent files
  if (!query) {
    const { data: recentFiles } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    const results = (recentFiles || []).map(fileToInlineResult);
    await ctx.answerInlineQuery(results, { cache_time: 300 });
    return;
  }

  // Search files matching the query
  const { data: searchResults } = await supabase
    .from('files')
    .select('*')
    .or(
      `title.ilike.%${query}%,subject.ilike.%${query}%,author.ilike.%${query}%,exam.ilike.%${query}%,file_name.ilike.%${query}%`
    )
    .limit(50);

  const results = (searchResults || []).map(fileToInlineResult);

  await ctx.answerInlineQuery(results, { cache_time: 300 });
}

/**
 * Convert a file record to an InlineQueryResult
 */
function fileToInlineResult(file: any): InlineQueryResultCachedDocument {
  // Build description
  let description = '';
  if (file.author) description += `👤 ${file.author} • `;
  if (file.subject) description += `📚 ${file.subject}`;
  if (file.exam) description += ` • 📝 ${file.exam}`;
  if (file.year) description += ` • ${file.year}`;

  return {
    type: 'document',
    id: file.id,
    title: file.title || file.file_name || 'Untitled',
    description: description || 'No description',
    document_file_id: file.telegram_file_id
  };
}
