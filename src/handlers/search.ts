import { Context } from 'grammy';
import { supabase } from '../lib/supabase';

export async function handleSearch(ctx: Context) {
  const query = ctx.match; // Command payload: /search <query>

  if (typeof query !== 'string' || !query.trim()) {
    return ctx.reply("Please provide a search term. Example: `/search Quantum Mechanics`", { parse_mode: "Markdown" });
  }

  const searchTerm = query.trim();
  const statusMsg = await ctx.reply(`Searching for "${searchTerm}"...`);

  try {
    // 1. Try strict subject match first
    const { data: subjectFiles, error: subjectError } = await supabase
      .from('files')
      .select('*')
      .ilike('subject', `%${searchTerm}%`)
      .limit(5);

    // 2. Try title match
    const { data: titleFiles, error: titleError } = await supabase
      .from('files')
      .select('*')
      .ilike('title', `%${searchTerm}%`)
      .limit(5);

    // 3. Try Year match (if numeric)
    let yearFiles: any[] = [];
    if (/^\d{4}$/.test(searchTerm)) {
      const year = parseInt(searchTerm);
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('year', year)
        .limit(5);
        
      if (!error && data) yearFiles = data;
    }

    if (subjectError) throw subjectError;
    if (titleError) throw titleError;

    // Combine results, deduping by ID
    const allFiles = [...(subjectFiles || []), ...(titleFiles || []), ...yearFiles];
    const uniqueFiles = Array.from(new Map(allFiles.map(item => [item.id, item])).values());

    if (uniqueFiles.length === 0) {
      return ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, `No files found for "${searchTerm}".`);
    }

    // 3. Format Response
    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, `🔎 **Search Results for "${searchTerm}":**`, { parse_mode: "Markdown" });
    
    for (const file of uniqueFiles) {
      // Build caption
      let caption = `📄 **${file.title}**\n`;
      if (file.author) caption += `✍ ${file.author}\n`;
      if (file.subject) caption += `◈ ${file.subject}`;
      if (file.exam) caption += ` | 📝 ${file.exam}`;
      if (file.year) caption += ` | 🗓 ${file.year}`;
      caption += `\n`;
      if (file.edition) caption += `📖 ${file.edition}\n`;
      if (file.semester) caption += `🎓 ${file.semester}\n`;

      try {
        // Send document using telegram_file_id
        await ctx.replyWithDocument(file.telegram_file_id, {
          caption,
          parse_mode: "Markdown"
        });
      } catch (err) {
        console.error(`Failed to send file ${file.title}:`, err);
        await ctx.reply(`Could not send "${file.title}" (File may be expired on Telegram servers).`);
      }
    }

  } catch (error) {
    console.error("Search error:", error);
    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, "❌ Error occurred during search.");
  }
}
