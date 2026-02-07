import { Context, InlineKeyboard } from 'grammy';
import { supabase } from '../lib/supabase';
import { getUserState, clearUserState, parseMetadataInput } from '../lib/state';

export async function handleChat(ctx: Context) {
  if (!ctx.message?.text) return;

  const userMessage = ctx.message.text;
  const userId = ctx.from?.id;

  if (!userId) return;

  // Check user state
  const userState = await getUserState(userId);

  // STATE MACHINE: Handle metadata input if user is awaiting metadata
  if (userState?.state === 'AWAITING_METADATA' && userState.pending_file_id) {
    if (userMessage === '/cancel') {
      await clearUserState(userId);
      await ctx.reply("❌ Operation cancelled.");
      return;
    }
    await handleMetadataInput(ctx, userMessage, userId, userState.pending_file_id);
    return;
  }

  // Handle Reply to Edit (Reply to a document)
  const replyTo = ctx.message.reply_to_message;
  // Check if reply is to a document (or audio/video if you support those)
  // For now, checks document or if reply is to a bot message with text (maybe tricky)
  if (replyTo?.document) {
    await handleReplyToEdit(ctx, userId, replyTo.document.file_id);
    return;
  }

  // Otherwise, treat as a search query
  if (userMessage.startsWith('/')) return; // Ignore other commands
  await handleSearch(ctx, userMessage);
}

/**
 * Handle metadata input from user after file upload
 */
async function handleMetadataInput(
  ctx: Context,
  text: string,
  userId: number,
  fileId: string
) {
  await ctx.replyWithChatAction("typing");

  try {
    // Parse the metadata from user input
    const metadata = parseMetadataInput(text);

    // Check if we got any metadata
    if (Object.keys(metadata).length === 0) {
      await ctx.reply(
        "❌ Could not parse metadata. Please use the format:\n\nname: Your Title\nsubject: Subject\n...\n\nOr type /cancel to cancel."
      );
      return;
    }

    // Update the file record with parsed metadata
    const { error: updateError } = await supabase
      .from('files')
      .update({
        title: metadata.title || 'Untitled',
        author: metadata.author,
        subject: metadata.subject || 'Uncategorized',
        exam: metadata.exam,
        year: metadata.year,
        edition: metadata.edition,
        semester: metadata.semester
      })
      .eq('id', fileId);

    if (updateError) {
      console.error("Metadata update error:", updateError);
      await ctx.reply("❌ Failed to save metadata. Please try again.");
      return;
    }

    // Clear user state
    await clearUserState(userId);

    // Confirm success
    let confirmText = `✨ **File information saved!**\n\n`;
    if (metadata.title) confirmText += `🏷 **Name:** ${metadata.title}\n`;
    if (metadata.author) confirmText += `✍ **Author:** ${metadata.author}\n`;
    if (metadata.subject) confirmText += `◈ **Subject:** ${metadata.subject}\n`;
    if (metadata.exam) confirmText += `📝 **Exam:** ${metadata.exam}\n`;
    if (metadata.year) confirmText += `🗓 **Year:** ${metadata.year}\n`;
    if (metadata.edition) confirmText += `📖 **Edition:** ${metadata.edition}\n`;
    if (metadata.semester) confirmText += `🎓 **Semester:** ${metadata.semester}\n`;

    await ctx.reply(confirmText, { parse_mode: "Markdown" });

  } catch (error) {
    console.error("Error handling metadata input:", error);
    await ctx.reply("✖ An error occurred. Please try again.");
  }
}

/**
 * Handle search query
 */
async function handleSearch(ctx: Context, query: string) {
  const searchTerm = query.trim();
  
  if (searchTerm.length < 2) {
    await ctx.reply("Please send a longer search query (at least 2 characters).");
    return;
  }

  await ctx.replyWithChatAction("typing");

  try {
    // Search across multiple fields
    const { data: searchResults, error } = await supabase
      .from('files')
      .select('*')
      .or(
        `title.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%,exam.ilike.%${searchTerm}%`
      )
      .limit(5);

    if (error) throw error;

    if (!searchResults || searchResults.length === 0) {
      await ctx.reply(`No files found for "${searchTerm}".`);
      return;
    }

    // Send matching files
    await ctx.reply(`🗂 **Found ${searchResults.length} matching file(s):**`, { parse_mode: "Markdown" });

    for (const file of searchResults) {
      try {
        // Build caption
        let caption = `📄 **${file.title}**\n`;
        if (file.author) caption += `✍ ${file.author}\n`;
        if (file.subject) caption += `◈ ${file.subject}`;
        if (file.exam) caption += ` | 📝 ${file.exam}`;
        if (file.year) caption += ` | 🗓 ${file.year}`;
        caption += `\n`;
        if (file.edition) caption += `📖 ${file.edition}\n`;
        if (file.semester) caption += `🎓 ${file.semester}\n`;

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

    // Add "Other Files" button for inline query
    const keyboard = new InlineKeyboard().switchInline("🔍 Search All Files", searchTerm);

    await ctx.reply(
      "Don't see what you're looking for? Try searching all files:",
      { reply_markup: keyboard }
    );

  } catch (error) {
    console.error("Search error:", error);
    await ctx.reply("✖ An error occurred during search.");
  }
}

import { setUserState } from '../lib/state';

async function handleReplyToEdit(ctx: Context, userId: number, telegramFileId: string) {
  // Find file in DB
  const { data: file, error } = await supabase
    .from('files')
    .select('*')
    .eq('telegram_file_id', telegramFileId)
    .single();

  if (error || !file) {
    await ctx.reply("✖ Could not find this file in the database.");
    return;
  }

  // Set state to awaiting metadata
  await setUserState(userId, 'AWAITING_METADATA', file.id);

  // Send instructions
  let text = `✍ **Editing: ${file.title}**\n\n`;
  text += `Send the new metadata to update it:\n`;
  text += `\`\`\`\nname: ${file.title}\nauthor: ${file.author || ''}\nsubject: ${file.subject || ''}\n...\n\`\`\`\n`;
  text += `(Only send the fields you want to change. Type /cancel to stop)`;

  await ctx.reply(text, { parse_mode: "Markdown" });
}
