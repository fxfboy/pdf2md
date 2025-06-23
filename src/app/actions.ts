
'use server';

import { extractTextFromPdf } from '@/ai/flows/extract-text-from-pdf';
import { z } from 'zod';

const ConvertPdfSchema = z.object({
  pdfDataUri: z.string().startsWith('data:application/pdf;base64,', { message: "Invalid PDF data URI" }),
  filename: z.string().min(1, { message: "Filename cannot be empty" }),
});

export async function convertPdfToMarkdown(data: { pdfDataUri: string; filename: string }) {
  try {
    const validatedData = ConvertPdfSchema.parse(data);

    const result = await extractTextFromPdf({
      pdfDataUri: validatedData.pdfDataUri,
      filename: validatedData.filename,
    });

    return { success: true, markdown: result.markdownText };
  } catch (error) {
    console.error('Conversion failed:', error);
    if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid input data. Please provide a valid PDF file.' };
    }
    return { success: false, error: 'An unexpected error occurred during conversion. The AI model may be unable to process this file.' };
  }
}
