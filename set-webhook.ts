import { bot } from './src/bot';
import { config } from './src/lib/config';

async function setWebhook() {
  const url = process.argv[2];
  
  if (!url) {
    console.error("Please provide your Vercel URL. Example: ts-node set-webhook.ts https://your-app.vercel.app");
    process.exit(1);
  }

  // Vercel endpoint is at /api/bot
  const webhookUrl = `${url.endsWith('/') ? url.slice(0, -1) : url}/api/bot`;

  console.log(`Setting webhook to: ${webhookUrl}...`);
  
  try {
    const result = await bot.api.setWebhook(webhookUrl);
    if (result) {
      console.log("✅ Webhook set successfully!");
      
      const info = await bot.api.getWebhookInfo();
      console.log("Current Webhook Info:", info);
    } else {
      console.error("❌ Failed to set webhook.");
    }
  } catch (error) {
    console.error("❌ Error setting webhook:", error);
  }
}

setWebhook();
