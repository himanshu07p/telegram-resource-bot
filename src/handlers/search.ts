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
    let responseText = `🔎 **Search Results for "${searchTerm}":**\n\n`;
    
    for (const file of uniqueFiles) {
      responseText += `📄 **${file.title}**\n`;
      responseText += `   Category: ${file.category} | Subject: ${file.subject}\n`;
      if (file.year) responseText += `   Year: ${file.year}`;
      if (file.edition) responseText += ` | Ed: ${file.edition}`;
      if (file.semester) responseText += ` | Sem: ${file.semester}`;
      responseText += `\n`;
      // We need to generate a signed URL or public URL. Assuming bucket is public for read or we generate signed url.
      // For simplicity, let's assume public bucket or generate signed URL.
      
      const { data: signedUrlData } = await supabase.storage
        .from('documents')
        .createSignedUrl(file.storage_path, 3600); // 1 hour link
        
      if (signedUrlData) {
        responseText += `   [Download File](${signedUrlData.signedUrl})\n\n`;
      } else {
         responseText += `   (Download unavailable)\n\n`;
      }
    }

    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, responseText, { parse_mode: "Markdown" });

  } catch (error) {
    console.error("Search error:", error);
    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, "❌ Error occurred during search.");
  }
}
