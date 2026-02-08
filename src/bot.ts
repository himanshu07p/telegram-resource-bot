import { Bot, webhookCallback } from 'grammy';
import { config } from './lib/config';

if (!config.telegramToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

export const bot = new Bot(config.telegramToken);


import { handleFileUpload } from './handlers/upload';
import { handleSearch } from './handlers/search';
import { handleChat, handleFileCallback } from './handlers/chat';
import { handleInlineQuery } from './handlers/inline';
import { Context, InlineKeyboard } from 'grammy';

import { saveUser } from './lib/supabase';

// Middleware to save user details
bot.use(async (ctx, next) => {
  if (ctx.from) {
    // Fire and forget - don't await so we don't block the bot
    saveUser(ctx.from).catch(err => console.error("Failed to save user", err));
  }
  await next();
});

import { authMiddleware } from './middleware/auth';
bot.use(authMiddleware);

bot.command("start", (ctx) => ctx.reply("Welcome! Send me a document and I'll help you organize it.\n\nCommands:\n/search - Search for files\n/formats - Get metadata templates\n/help - Show help menu\n/cancel - Cancel current operation"));

bot.command("formats", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("🍵 Academic Book", "tpl_book").text("✨ Notes", "tpl_notes").row()
    .text("🎓 PYQ / Exam", "tpl_pyq").text("🌙 Book (Novel)", "tpl_novel");

  await ctx.reply("Choose a template  ⤵", { reply_markup: keyboard });
});

bot.callbackQuery(/^tpl_/, async (ctx) => {
  const type = ctx.callbackQuery.data.replace("tpl_", "");
  let template = "";
  let title = "";

  switch (type) {
    case "book":
      title = "🍵  Academic Book";
      template = `name: \nauthor: \nsubject: \nyear: \nedition: `;
      break;
    case "notes":
      title = "✨  Notes";
      template = `name: \nsubject: \nsemester: \nauthor: `;
      break;
    case "pyq":
      title = "🎓  PYQ / Exam";
      template = `name: \nsubject: \nexam: \nyear: `;
      break;
    case "novel":
      title = "🌙  Book (Novel/Fiction)";
      template = `name: \nauthor: \ngenre: \nyear: `;
      break;
  }

  await ctx.answerCallbackQuery();
  await ctx.reply(`${title}\n(Simply copy & fill)\n\n\`${template}\``, { parse_mode: "Markdown" });
});

// Help Command Handler
bot.command("help", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("📤 Uploading Files", "help_upload").text("🔍 Searching", "help_search").row()
    .text("📝 Metadata Formats", "help_meta").text("🤝 Sharing", "help_share").row()
    .text("🔑 Login & Auth", "help_auth");

  await ctx.reply(
    "👋 **Need help? Select a topic below:**",
    { reply_markup: keyboard, parse_mode: "Markdown" }
  );
});

// Help Callback Handler
bot.callbackQuery(/^help_/, async (ctx) => {
  const topic = ctx.callbackQuery.data.replace("help_", "");
  let text = "";

  const backKeyboard = new InlineKeyboard().text("🔙 Back to Help Menu", "help_menu");

  switch (topic) {
    case "menu":
      // Show main menu again
      const mainKeyboard = new InlineKeyboard()
        .text("📤 Uploading Files", "help_upload").text("🔍 Searching", "help_search").row()
        .text("📝 Metadata Formats", "help_meta").text("🤝 Sharing", "help_share").row()
        .text("🔑 Login & Auth", "help_auth");
      
      await ctx.editMessageText("👋 **Need help? Select a topic below:**", { reply_markup: mainKeyboard, parse_mode: "Markdown" });
      await ctx.answerCallbackQuery();
      return;

    case "upload":
      text = `📤 **How to Upload Files**\n\n` +
             `1. **Send any file** (PDF, DOCX, EPUB, etc.) to this chat.\n` +
             `2. The bot will ask for **metadata** (Title, Author, Subject, etc.).\n` +
             `3. **Copy & Paste** the template provided or type the info manually.\n` +
             `4. Once saved, the file becomes searchable for everyone!\n\n` +
             `_Note: You must be logged in to upload._`;
      break;

    case "search":
      text = `🔍 **How to Search**\n\n` +
             `• **Option 1:** Type \`/search <query>\` (e.g., \`/search physics\`).\n` +
             `  _Best for browsing results in a list._\n\n` +
             `• **Option 2:** Type \`@${ctx.me.username} <query>\` in the text box.\n` +
             `  _Best for quickly sharing files in other chats._`;
      break;

    case "meta":
      text = `📝 **Metadata Formats**\n\n` +
             `Proper metadata helps everyone find files easily.\n` +
             `Use the \`/formats\` command to get copy-paste templates for:\n` +
             `• 🍵 Academic Books\n` +
             `• ✨ Personal Notes\n` +
             `• 🎓 PYQs / Exam Papers\n` +
             `• 🌙 Novels / Fiction\n\n` +
             `_Tip: You can skip fields you don't know._`;
      break;

    case "share":
      text = `🤝 **Sharing is Caring**\n\n` +
             `You can share files from this bot directly to other chats!\n\n` +
             `1. Type \`@${ctx.me.username} <search_term>\` in ANY chat.\n` +
             `2. A list of files will appear above your keyboard.\n` +
             `3. Tap a file to send it immediately.`;
      break;

    case "auth":
      text = `🔑 **Authentication**\n\n` +
             `• **Login:** Use \`/login\` and enter the bot password to start a session.\n` +
             `• **Uploads:** Only logged-in users can upload files.\n` +
             `• **Session:** Your login session lasts for **10 minutes** of inactivity.\n` +
             `• **Logout:** You are automatically logged out after timeout.`;
      break;
  }

  await ctx.editMessageText(text, { reply_markup: backKeyboard, parse_mode: "Markdown" });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(/^get_file_/, handleFileCallback);

bot.command("cancel", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const { clearUserState } = await import('./lib/state');
  await clearUserState(userId);
  await ctx.reply("✅ Operation cancelled.");
});

bot.on("message:document", handleFileUpload);

bot.command("search", handleSearch);

bot.on("message:text", handleChat);

// Inline query handler for "Other Files" feature
bot.on("inline_query", handleInlineQuery);

// Error handling
bot.catch((err) => {
  console.error(`Error while handling update ${err.ctx.update.update_id}:`);
  console.error(err.error);
});

// For Vercel, we need to export the webhook callback

