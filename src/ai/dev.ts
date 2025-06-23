import { config } from 'dotenv';
config();

import '@/ai/flows/extract-text-from-pdf.ts';
import '@/ai/flows/extract-assets-and-links.ts';
import '@/ai/flows/generate-markdown-from-text.ts';