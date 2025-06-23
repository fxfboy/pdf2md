// extract-text-from-pdf.ts
'use server';

/**
 * @fileOverview Extracts text from a PDF file.
 *
 * - extractTextFromPdf - A function that handles the PDF text extraction process.
 * - ExtractTextFromPdfInput - The input type for the extractTextFromPdf function.
 * - ExtractTextFromPdfOutput - The return type for the extractTextFromPdf function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractTextFromPdfInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  filename: z.string().describe('The name of the PDF file.'),
});
export type ExtractTextFromPdfInput = z.infer<typeof ExtractTextFromPdfInputSchema>;

const ExtractTextFromPdfOutputSchema = z.object({
  markdownText: z.string().describe('The extracted text from the PDF in Markdown format.'),
});
export type ExtractTextFromPdfOutput = z.infer<typeof ExtractTextFromPdfOutputSchema>;

export async function extractTextFromPdf(input: ExtractTextFromPdfInput): Promise<ExtractTextFromPdfOutput> {
  return extractTextFromPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTextFromPdfPrompt',
  input: {schema: ExtractTextFromPdfInputSchema},
  output: {schema: ExtractTextFromPdfOutputSchema},
  prompt: `You are an expert in extracting text from PDF files and converting it to Markdown format.

  Extract the text content from the following PDF data and convert it into Markdown format, preserving the original layout and formatting as much as possible.

  When converting to markdown, pay close attention to the structure of the document. Try to match the headings, bulleted lists, numbered lists, and tables from the PDF, using appropriate markdown equivalents. Be aware that markdown does not support multiple columns, so represent the document in a single column. Be aware that markdown does not support positioning elements at arbitrary locations.

  If the PDF contains images or tables, save them as separate files and reference them in the Markdown document using the appropriate Markdown syntax.

  PDF Filename: {{{filename}}}
  PDF Data: {{media url=pdfDataUri}}
  `,
});

const extractTextFromPdfFlow = ai.defineFlow(
  {
    name: 'extractTextFromPdfFlow',
    inputSchema: ExtractTextFromPdfInputSchema,
    outputSchema: ExtractTextFromPdfOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
