'use server';
/**
 * @fileOverview Extracts images and tables from a PDF, saves them as separate files,
 * and generates markdown links to these assets to maintain the original PDF formatting.
 *
 * - extractAssetsAndLinks - A function that handles the extraction and linking process.
 * - ExtractAssetsAndLinksInput - The input type for the extractAssetsAndLinks function.
 * - ExtractAssetsAndLinksOutput - The return type for the extractAssetsAndLinks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractAssetsAndLinksInputSchema = z.object({
  pdfText: z.string().describe('The text content extracted from the PDF.'),
  imageFilenames: z.array(z.string()).describe('Filenames of the extracted images.'),
  tableFilenames: z.array(z.string()).describe('Filenames of the extracted tables.'),
});
export type ExtractAssetsAndLinksInput = z.infer<typeof ExtractAssetsAndLinksInputSchema>;

const ExtractAssetsAndLinksOutputSchema = z.string().describe('Markdown content with links to extracted assets.');
export type ExtractAssetsAndLinksOutput = z.infer<typeof ExtractAssetsAndLinksOutputSchema>;

export async function extractAssetsAndLinks(input: ExtractAssetsAndLinksInput): Promise<ExtractAssetsAndLinksOutput> {
  return extractAssetsAndLinksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractAssetsAndLinksPrompt',
  input: {schema: ExtractAssetsAndLinksInputSchema},
  output: {schema: ExtractAssetsAndLinksOutputSchema},
  prompt: `You are an expert in converting PDF content to Markdown format while preserving the original layout.

You have extracted the text content, images, and tables from a PDF.
Your task is to generate a Markdown file that includes the text content and correctly links to the extracted images and tables.

Text Content:
{{pdfText}}

Image Filenames:
{{#each imageFilenames}}
- {{{this}}}
{{/each}}

Table Filenames:
{{#each tableFilenames}}
- {{{this}}}
{{/each}}

Create the markdown content, ensuring that image and table references are correctly placed within the text.
Assume that the images and tables are located in the same directory as the Markdown file.
`,
});

const extractAssetsAndLinksFlow = ai.defineFlow(
  {
    name: 'extractAssetsAndLinksFlow',
    inputSchema: ExtractAssetsAndLinksInputSchema,
    outputSchema: ExtractAssetsAndLinksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

