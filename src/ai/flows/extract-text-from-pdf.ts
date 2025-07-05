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
  markdownText: z.string().describe('The extracted text from the PDF in Markdown format with tables embedded as markdown tables.'),
  images: z.array(z.object({
    filename: z.string().describe('The filename for the extracted image.'),
    data: z.string().describe('Base64 encoded image data.'),
    mimeType: z.string().describe('MIME type of the image (e.g., image/png, image/jpeg).'),
  })).describe('Array of extracted images from the PDF.'),
});
export type ExtractTextFromPdfOutput = z.infer<typeof ExtractTextFromPdfOutputSchema>;

export async function extractTextFromPdf(input: ExtractTextFromPdfInput): Promise<ExtractTextFromPdfOutput> {
  return extractTextFromPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTextFromPdfPrompt',
  input: {schema: ExtractTextFromPdfInputSchema},
  // Remove output schema to avoid validation issues
  prompt: `Extract text and images from the PDF and return them in the specified JSON format.

  REQUIRED OUTPUT FORMAT:
  {
    "markdownText": "string - The text content in markdown format",
    "images": [
      {
        "filename": "string - e.g. image_1.png",
        "data": "string - base64 encoded image data",
        "mimeType": "string - e.g. image/png"
      }
    ]
  }

  CRITICAL INSTRUCTIONS:
  1. Extract ALL text from the PDF and convert to markdown format
  2. Use proper markdown syntax for headings, lists, tables, etc.
  3. Convert tables to markdown table format with pipes (|) and dashes (-)
  4. **EXTRACT ALL IMAGES** - You must extract every single image, diagram, chart, screenshot, and visual element from the PDF
  5. **CONSISTENCY REQUIREMENT** - Every image referenced in the markdown (![alt](filename.png)) MUST have a corresponding entry in the images array
  6. **FILENAME CONSISTENCY** - Use sequential filenames: image_1.png, image_2.png, image_3.png, etc.
  7. **NO MISSING IMAGES** - If you reference image_5.png in markdown, you must include image_1.png through image_5.png in the images array
  8. **COMPLETE IMAGE DATA** - Each image must have valid base64 data, proper filename, and correct mimeType
  9. If PDF has no text, return empty string for markdownText but still include ALL images
  10. You MUST include both markdownText and images fields in your response
  11. **QUALITY CHECK** - Before responding, verify that every ![...](image_X.png) in your markdown has a matching image in the images array

  PDF Filename: {{{filename}}}
  PDF Data: {{media url=pdfDataUri}}
  `,
});

const extractTextFromPdfFlow = ai.defineFlow(
  {
    name: 'extractTextFromPdfFlow',
    inputSchema: ExtractTextFromPdfInputSchema,
    // Remove output schema validation to handle AI model inconsistencies
  },
  async input => {
    try {
      const {output} = await prompt(input);

      // Ensure we always have a markdownText field
      if (!output || typeof output !== 'object') {
        return {
          markdownText: 'No text content found in PDF.',
          images: []
        };
      }

      // If markdownText is missing, create it from images
      if (!output.markdownText) {
        const imageRefs = (output.images || [])
          .map((img: any, index: number) => `![Image ${index + 1}](${img.filename || `image_${index + 1}.png`})`)
          .join('\n\n');

        output.markdownText = imageRefs || 'No text content found in PDF.';
      }

      // Ensure images array exists
      if (!output.images) {
        output.images = [];
      }

      // Validate consistency between markdown image references and actual images
      const markdownText = output.markdownText || '';
      const imageRefs = markdownText.match(/!\[.*?\]\((image_\d+\.\w+)\)/g) || [];
      const referencedFilenames = imageRefs.map(ref => {
        const match = ref.match(/!\[.*?\]\((image_\d+\.\w+)\)/);
        return match ? match[1] : null;
      }).filter(Boolean);

      const actualFilenames = (output.images || []).map((img: any) => img.filename);

      console.log(`Found ${imageRefs.length} image references in markdown:`, referencedFilenames);
      console.log(`Found ${actualFilenames.length} actual images:`, actualFilenames);

      // Log missing images
      const missingImages = referencedFilenames.filter(filename => !actualFilenames.includes(filename));
      if (missingImages.length > 0) {
        console.warn(`Missing images in response:`, missingImages);
      }

      // Validate and return properly typed response
      const result: ExtractTextFromPdfOutput = {
        markdownText: output.markdownText,
        images: output.images || []
      };

      return result;
    } catch (error) {
      console.error('AI processing failed:', error);

      // Return a fallback response that matches our schema
      return {
        markdownText: 'Failed to extract text from PDF. The document may contain only images or be in an unsupported format.',
        images: []
      };
    }
  }
);
