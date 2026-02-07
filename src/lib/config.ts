import dotenv from 'dotenv';
dotenv.config();

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  botPasswords: (process.env.BOT_ACCESS_PASSWORD || '').split(',').map(p => p.trim()).filter(p => p.length > 0),
};

if (!config.telegramToken) console.warn("Missing TELEGRAM_BOT_TOKEN");
if (!config.supabaseUrl) console.warn("Missing SUPABASE_URL");
if (!config.supabaseKey) console.warn("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!config.googleApiKey) console.warn("Missing GOOGLE_API_KEY");
if (config.botPasswords.length === 0) console.warn("Missing BOT_ACCESS_PASSWORD");
