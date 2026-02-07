import { PDFDocument } from 'pdf-lib';
import pdfParse from 'pdf-parse';

/**
 * Extracts text from a PDF buffer.
 * If the PDF has > 50 pages, it only extracts text from the first 10 pages.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number; isTruncated: boolean }> {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    const pageCount = pdfDoc.getPageCount();
    let processingBuffer = buffer;
    let isTruncated = false;

    if (pageCount > 50) {
      // Create a new document with only the first 10 pages
      const subDoc = await PDFDocument.create();
      const copiedPages = await subDoc.copyPages(pdfDoc, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); // 0-indexed
      copiedPages.forEach((page) => subDoc.addPage(page));
      const uint8Array = await subDoc.save();
      processingBuffer = Buffer.from(uint8Array);
      isTruncated = true;
    }

    // @ts-ignore
    const data = await pdfParse(processingBuffer);
    return {
      text: data.text,
      pageCount,
      isTruncated
    };
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error("Failed to process PDF");
  }
}
