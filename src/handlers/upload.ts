import { Context } from 'grammy';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { setUserState } from '../lib/state';

export async function handleFileUpload(ctx: Context) {
  if (!ctx.message || !ctx.message.document) return;

  const doc = ctx.message.document;
  const userId = ctx.from?.id;
  
  if (!userId) {
    return ctx.reply("❌ Unable to identify user.");
  }

  // Accept any document type (not just PDF)
  const statusMsg = await ctx.reply("📄 File received! Saving...");

  try {
    // 1. Get file link
    const file = await ctx.api.getFile(doc.file_id);
    if (!file.file_path) throw new Error("Could not get file path");
    const fileUrl = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`;

    // 2. Download file
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Upload to Supabase Storage
    const storagePath = `${userId}/${Date.now()}_${doc.file_name || 'document'}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: doc.mime_type || 'application/octet-stream',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 4. Create pending database record
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        telegram_file_id: doc.file_id,
        file_name: doc.file_name,
        storage_path: storagePath,
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
    const instructionText = `✨ **File saved!** Now please send the info in this format:

\`\`\`
name: [Document Name]
author: [Author Name]
subject: [Subject]
exam: [Exam Name]
year: [Year]
edition: [Edition]
semester: [Semester]
\`\`\`

**Example:**
\`\`\`
name: Concepts of Physics Vol 1
author: HC Verma
subject: Physics
exam: JEE Advanced
year: 2024
edition: 5th Edition
semester: 1st Sem
\`\`\`

You can skip any field by not including it. Just send the information as plain text.

Type /cancel to cancel this upload.`;

    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, instructionText, { parse_mode: "Markdown" });

  } catch (error) {
    console.error("Upload handler error:", error);
    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, "✖ Error processing file. Please try again.");
  }
}
