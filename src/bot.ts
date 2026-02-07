import { Bot, webhookCallback } from 'grammy';
import { config } from './lib/config';

if (!config.telegramToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

export const bot = new Bot(config.telegramToken);


import { handleFileUpload } from './handlers/upload';
import { handleSearch } from './handlers/search';
import { handleChat } from './handlers/chat';
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

bot.command("start", (ctx) => ctx.reply("Welcome! Send me a document and I'll help you organize it.\n\nCommands:\n/search - Search for files\n/formats - Get metadata templates\n/cancel - Cancel current operation"));

bot.command("formats", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("🍵 Book", "tpl_book").text("✨ Notes", "tpl_notes").row()
    .text("🎓 PYQ / Exam", "tpl_pyq").text("🌙 Novel", "tpl_novel");

  await ctx.reply("Choose a template  ⤵", { reply_markup: keyboard });
});

bot.callbackQuery(/^tpl_/, async (ctx) => {
  const type = ctx.callbackQuery.data.replace("tpl_", "");
  let template = "";
  let title = "";

  switch (type) {
    case "book":
      title = "🍵  Book";
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
      title = "🌙  Novel";
      template = `name: \nauthor: \ngenre: \nyear: `;
      break;
  }

  await ctx.answerCallbackQuery();
  await ctx.reply(`${title}\n(Simply copy & fill)\n\n\`${template}\``, { parse_mode: "Markdown" });
});

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

