import { google } from '@ai-sdk/google';
import { generateText, Output } from 'ai';
import { z } from 'zod';

const documentMetadataSchema = z.object({
  title: z.string().describe('A concise, descriptive title for the document (max 100 chars)'),
  description: z.string().describe('A summary of the document content, key points, and purpose (2-3 sentences)'),
  tags: z.array(z.string()).describe('Relevant keywords and tags for searchability (5-10 tags)'),
  documentType: z.string().describe('Type of document: invoice, report, manual, article, contract, resume, letter, presentation, spreadsheet, other'),
});

export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;

export const documentAnalysisService = {
  /**
   * Analyze document text using AI and extract metadata
   */
  async analyze(text: string, context?: string): Promise<DocumentMetadata> {
    // Truncate text if too long (keep first 15000 chars for analysis)
    const truncatedText = text.length > 15000 ? text.substring(0, 15000) + '...' : text;

    const prompt = context
      ? `Analyze this document. User provided context: "${context}".
         Extract a descriptive title, summary description, relevant tags, and document type.

         Document content:
         ${truncatedText}`
      : `Analyze this document.
         Extract a descriptive title, summary description, relevant tags, and document type.
         Focus on: main topic, key points, entities mentioned, and purpose of the document.

         Document content:
         ${truncatedText}`;

    const result = await generateText({
      model: google('gemini-2.0-flash-exp'),
      output: Output.object({ schema: documentMetadataSchema }),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    console.log('[Document Analysis] Result:', result?.output);
    return result.output!;
  },
};