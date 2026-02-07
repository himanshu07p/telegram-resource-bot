import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config';

const genAI = new GoogleGenerativeAI(config.googleApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export interface FileMetadata {
  category: "Book" | "Personal Notes" | "PYQs/Exams" | "Other";
  subject: string;
  title: string;
  year?: number;
  edition?: string;
  semester?: string;
  summary?: string;
}

export async function analyzePdfText(text: string, originalFilename: string): Promise<FileMetadata> {
  const prompt = `
    Analyze the following text extracted from the beginning of a PDF file.
    Original Filename: "${originalFilename}"

    Identify the following:
    1. Category: Must be one of ["Book", "Personal Notes", "PYQs/Exams"]. If unsure, use "Other".
    2. Subject: The academic subject (e.g., "Physics", "Computer Science").
    3. Title: A clean, descriptive title.
    4. Year: The publication year (for books) or exam year (for PYQs). Return as number or null.
    5. Edition: The edition (e.g., "3rd Edition") if applicable. Return string or null.
    6. Semester: The semester (e.g., "3rd Sem", "Spring 2024") if mentioned. Return string or null.
    7. Summary: A very brief 1-sentence summary.

    Return the result as a valid JSON object with keys: "category", "subject", "title", "year", "edition", "semester", "summary".
    Do not include markdown formatting like \`\`\`json. Just the raw JSON.

    Text Snippet:
    ${text.slice(0, 5000)}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(textResponse) as FileMetadata;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    if ((error as any).response) {
       console.error("Gemini API Response Error:", JSON.stringify((error as any).response, null, 2));
    }

    // Fallback
    return {
      category: "Other",
      subject: "Uncategorized",
      title: originalFilename,
      summary: "Could not analyze."
    };
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function chatWithLlm(query: string, maxRetries: number = 3): Promise<string> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent(query);
      return result.response.text();
    } catch (error: any) {
      lastError = error;
      console.error(`Gemini Chat Error (attempt ${attempt + 1}/${maxRetries}):`, error.message || error);
      
      // Check if it's a rate limit error (429)
      if (error.status === 429) {
        // Extract retry delay from error if available, otherwise use exponential backoff
        let waitTime = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s...
        
        if (error.errorDetails) {
          const retryInfo = error.errorDetails.find((d: any) => d['@type']?.includes('RetryInfo'));
          if (retryInfo?.retryDelay) {
            const delayMatch = retryInfo.retryDelay.match(/(\d+)/);
            if (delayMatch) {
              waitTime = parseInt(delayMatch[1]) * 1000;
            }
          }
        }
        
        console.log(`Rate limited. Waiting ${waitTime / 1000}s before retry...`);
        await sleep(waitTime);
        continue;
      }
      
      // For non-rate-limit errors, don't retry
      break;
    }
  }
  
  console.error("Gemini Chat Error (all retries exhausted):", lastError);
  return "I'm having trouble thinking right now. Please try again later.";
}


export async function parseMetadataUpdate(userText: string, currentMetadata: Partial<FileMetadata>): Promise<Partial<FileMetadata>> {
  const prompt = `
    The user wants to update the metadata for a file.
    
    Current Metadata:
    ${JSON.stringify(currentMetadata, null, 2)}
    
    User Request: "${userText}"
    
    Instructions:
    1. Update the metadata based on the user's request.
    2. keys: "category", "subject", "title", "year", "edition", "semester", "summary".
    3. Category must be one of ["Book", "Personal Notes", "PYQs/Exams", "Other"].
    4. Return ONLY the JSON object with the updated fields. If a field is not changed, include it with its original value or omit it if you prefer (but returning the full object is safer).
    5. Do not include markdown formatting.
  `;

  try {
    const result = await model.generateContent(prompt);
    const textResponse = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(textResponse) as Partial<FileMetadata>;
  } catch (error) {
    console.error("Gemini Metadata Update Error:", error);
    return currentMetadata; // Return original on error
  }
}
