import { extractText, getDocumentProxy } from 'unpdf';

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
  };
}

export const pdfExtractionService = {
  /**
   * Extract text and metadata from a PDF buffer
   */
  async extract(buffer: Buffer): Promise<PdfExtractionResult> {
    const uint8Array = new Uint8Array(buffer);
    const pdf = await getDocumentProxy(uint8Array);

    // Extract text from all pages
    const { text, totalPages } = await extractText(pdf, { mergePages: true });

    // Extract PDF metadata
    const pdfMetadata = await pdf.getMetadata();
    const info = (pdfMetadata?.info || {}) as Record<string, unknown>;

    return {
      text: text || '',
      pageCount: totalPages,
      metadata: {
        title: info.Title as string | undefined,
        author: info.Author as string | undefined,
        subject: info.Subject as string | undefined,
        keywords: info.Keywords as string | undefined,
        creator: info.Creator as string | undefined,
        producer: info.Producer as string | undefined,
        creationDate: info.CreationDate as string | undefined,
        modificationDate: info.ModDate as string | undefined,
      },
    };
  },

  /**
   * Validate that a buffer is a valid PDF
   */
  isValidPdf(buffer: Buffer): boolean {
    // PDF files start with %PDF-
    const header = buffer.slice(0, 5).toString('ascii');
    return header === '%PDF-';
  },
};