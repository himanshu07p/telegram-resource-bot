import { webhookHandler } from '../src/webhook';

// Vercel Serverless Function entry point
export default async function handler(request: any, response: any) {
  try {
     // Check if it's the right method
    if (request.method !== 'POST') {
        return response.status(405).json({ error: "Method not allowed" });
    }
    
    // Pass to grammY
    await webhookHandler(request, response);
  } catch (error) {
    console.error('Webhook Error:', error);
    response.status(500).json({ error: "Internal Server Error" });
  }
}
