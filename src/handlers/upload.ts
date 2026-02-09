import { Context } from 'grammy';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { setUserState } from '../lib/state';
import { userSessions } from '../middleware/auth';

export async function handleFileUpload(ctx: Context) {
  if (!ctx.message || !ctx.message.document) return;

  const doc = ctx.message.document;
  const userId = ctx.from?.id;
  
  if (!userId) {
    return ctx.reply("❌ Unable to identify user.");
  }

  // Ignore files sent via inline mode (by this bot or others)
  if (ctx.message?.via_bot) {
    return;
  }

  // Accept any document type (not just PDF)
  const statusMsg = await ctx.reply("📄 File received! Saving...");

  try {
    // 4. Create pending database record
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        telegram_file_id: doc.file_id,
        file_name: doc.file_name,
        storage_path: doc.file_id, // Store Telegram file ID as storage path
        file_size: doc.file_size,
        // Metadata fields will be filled in later
        title: doc.file_name || 'Untitled',
        subject: 'Pending',
        category: 'Other'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 5. Set user state to AWAITING_METADATA
    await setUserState(userId, 'AWAITING_METADATA', fileRecord.id);

    // 6. Send metadata format instructions
    const session = userSessions.get(userId);
    let instructionText = "";

    if (session && !session.hasSeenInstructions) {
      // First time upload in this session - Send FULL instructions
      session.hasSeenInstructions = true;
      userSessions.set(userId, session);

      instructionText = `✨ **File saved!**\nNow please send the info using one of these formats:\n\n` +
        `**🍵 Academic Book**\n` +
        `\`\`\`\nname: [Title]\nauthor: [Author]\nsubject: [Subject]\nyear: [Year]\nedition: [Edition]\n\`\`\`\n\n` +
        
        `**✨ Notes**\n` +
        `\`\`\`\nname: [Title]\nsubject: [Subject]\nsemester: [Semester]\nauthor: [Author]\n\`\`\`\n\n` +
        
        `**🎓 PYQ / Exam**\n` +
        `\`\`\`\nname: [Title]\nsubject: [Subject]\nexam: [Exam Name]\nyear: [Year]\n\`\`\`\n\n` +
        
        `**🌙 Book (Novel/Fiction)**\n` +
        `\`\`\`\nname: [Title]\nauthor: [Author]\ngenre: [Genre]\nyear: [Year]\n\`\`\`\n\n` +
        
        `_(Tap to copy & edit. You can skip fields)_` +
        `\n\nType /cancel to cancel this upload.`;
    } else {
      // Subsequent uploads - Short message
      instructionText = `✨ **File saved!**\nPlease send the metadata (name, author, subject, etc.) or /cancel.`;
    }

    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, instructionText, { parse_mode: "Markdown" });

  } catch (error) {
    console.error("Upload handler error:", error);
    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, "✖ Error processing file. Please try again.");
  }
}
