import { Context, NextFunction } from 'grammy';
import { config } from '../lib/config';
import { isUserAuthenticated, updateUserAuth } from '../lib/supabase';

// In-memory store for users currently in the login flow (waiting for password)
const pendingLogins = new Set<number>();

export async function authMiddleware(ctx: Context, next: NextFunction) {
  const userId = ctx.from?.id;
  if (!userId) return next();

  // If user sends /login command
  if (ctx.message?.text === '/login') {
    if (await isUserAuthenticated(userId)) {
      await ctx.reply("You are already logged in!");
      return;
    }
    pendingLogins.add(userId);
    await ctx.reply("Please enter the bot access password:");
    return;
  }

  // If user is pending login (waiting for password)
  if (pendingLogins.has(userId)) {
    if (ctx.message?.text && config.botPasswords.includes(ctx.message.text)) {
      // Correct password
      pendingLogins.delete(userId);
      await updateUserAuth(userId, true);
      await ctx.reply("Login successful! You can now upload documents.");
    } else {
      // Wrong password
      await ctx.reply("Incorrect password. Please try again or type /login to restart.");
    }
    return; // Don't pass to other handlers (like chat)
  }

  // Check if user is authenticated for restricted actions (like file uploads)
  // We'll allow text chat for everyone, but block documents if not logged in.
  if (ctx.message?.document) {
    const isAuthenticated = await isUserAuthenticated(userId);
    if (!isAuthenticated) {
      await ctx.reply("🔒 You must login to upload documents. Use /login to authenticate.");
      return;
    }
  }

  // Pass to next handler (e.g., chat handler, upload handler)
  await next();
}
