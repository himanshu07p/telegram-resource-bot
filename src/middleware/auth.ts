import { Context, NextFunction } from 'grammy';
import { config } from '../lib/config';
import { isUserAuthenticated, updateUserAuth } from '../lib/supabase';

// In-memory store for users currently in the login flow (waiting for password)
const pendingLogins = new Set<number>();

// In-memory store for user sessions (last activity timestamp + has seen instructions)
export const userSessions = new Map<number, { lastActivity: number; hasSeenInstructions: boolean }>();

export async function authMiddleware(ctx: Context, next: NextFunction) {
  const userId = ctx.from?.id;
  if (!userId) return next();

  // If user sends /login command
  if (ctx.message?.text === '/login') {
    if (await isUserAuthenticated(userId)) {
      // Check if session exists or is expired
      const session = userSessions.get(userId);
      if (session && Date.now() - session.lastActivity < 10 * 60 * 1000) {
        await ctx.reply("You are already logged in!");
        return;
      }
      // If expired but DB says yes, force re-login (or just refresh session? User said only 10 min valid)
      // Actually, let's treat it as expired and proceed to login flow.
      await updateUserAuth(userId, false);
    }
    pendingLogins.add(userId);
    await ctx.reply("Please enter the bot access password:");
    return;
  }

  // If user is pending login (waiting for password)
  if (pendingLogins.has(userId)) {
    const text = ctx.message?.text;
    
    if (!text) return; // Ignore non-text updates while waiting for password

    // Allow cancelling
    if (text === '/cancel') {
      pendingLogins.delete(userId);
      await ctx.reply("Login cancelled.");
      return;
    }

    // If user sends another command, assume they want to abort login
    if (text.startsWith('/')) {
        pendingLogins.delete(userId);
        return next(); // Process the new command
    }

    if (config.botPasswords.includes(text)) {
      // Correct password
      pendingLogins.delete(userId);
      await updateUserAuth(userId, true);
      // Initialize session
      userSessions.set(userId, { lastActivity: Date.now(), hasSeenInstructions: false });
      await ctx.reply("Login successful! You can now upload documents (Session valid for 10 min).");
    } else {
      // Wrong password
      await ctx.reply("Incorrect password. Please try again or type /cancel.");
    }
    return; // Don't pass to other handlers
  }

  // Check if user is authenticated for restricted actions (like file uploads)
  // Skip if this document was sent via inline mode (not an actual user upload)
  if (ctx.message?.document && !ctx.message.via_bot) {
    const isAuthenticated = await isUserAuthenticated(userId);
    
    // Check session timeout
    const session = userSessions.get(userId);
    if (isAuthenticated) {
      if (!session || (Date.now() - session.lastActivity > 10 * 60 * 1000)) {
        // Session expired or missing (e.g. restart)
        await updateUserAuth(userId, false);
        userSessions.delete(userId);
        await ctx.reply("🔒 Session expired due to inactivity. Please /login again.");
        return;
      }
      // Update activity
      session.lastActivity = Date.now();
      userSessions.set(userId, session);
    } else {
      await ctx.reply("🔒 You must login to upload documents. Use /login to authenticate.");
      return;
    }
  }

  // Pass to next handler (e.g., chat handler, upload handler)
  await next();
}
