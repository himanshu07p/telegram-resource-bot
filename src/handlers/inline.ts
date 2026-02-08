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

  // Maps files to inline results
  const results: any[] = (searchResults || []).map((file, index) => fileToInlineResult(file, index));

  if (query.length > 0) {
    // Add "Other" result at the end
    results.push({
      type: 'article',
      id: 'other_search',
      title: '🔍 Other / Search Again',
      description: `Tap to modify search for "${query}"`,
      input_message_content: {
        message_text: `🔎 Showing results for: **${query}**\n\nIf you couldn't find your file, try refining your search or request it.`,
        parse_mode: 'Markdown'
      },
      reply_markup: {
        inline_keyboard: [[
            { text: "🔄 Search Again", switch_inline_query_current_chat: query }
        ]]
      }
    });
  }

  await ctx.answerInlineQuery(results, { cache_time: 10, is_personal: true });
}

/**
 * Convert a file record to an InlineQueryResult
 */
function fileToInlineResult(file: any, index: number): InlineQueryResultCachedDocument {
  // Build description
  let description = '';
  if (file.author) description += `👤 ${file.author} • `;
  if (file.subject) description += `📚 ${file.subject}`;
  if (file.exam) description += ` • 📝 ${file.exam}`;
  if (file.year) description += ` • ${file.year}`;

  // Add numbering to title for the "list" feel
  const numParams = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
  const numPrefix = index < 10 ? numParams[index] : `${index + 1}.`;

  return {
    type: 'document',
    id: file.id,
    title: `${numPrefix} ${file.title || file.file_name || 'Untitled'}`,
    description: description || 'No description',
    document_file_id: file.telegram_file_id,
    caption: `📄 **${file.title}**\n${description}`, // Caption for the sent file
    parse_mode: 'Markdown'
  };
}
