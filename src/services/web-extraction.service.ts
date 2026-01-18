import { scrapeTool } from 'firecrawl-aisdk';

export interface WebContent {
  title: string;
  description: string;
  content: string;
  thumbnail: string | null;
  metadata: {
    domain: string;
    favicon?: string;
    author?: string;
  };
}

export const webExtractionService = {
  /**
   * Extract content from a webpage using Firecrawl
   */
  async extractContent(url: string): Promise<WebContent> {
    if (!scrapeTool.execute) {
      throw new Error('Firecrawl scrape tool not available');
    }

    // Execute the scrape tool directly
    const result = await scrapeTool.execute(
      { url, formats: ['markdown'] },
      { toolCallId: 'scrape', messages: [] }
    );

    // Extract domain from URL
    let domain = '';
    try {
      domain = new URL(url).hostname;
    } catch {
      domain = url;
    }

    // Handle the result which may be a string or object
    const data = typeof result === 'string' ? JSON.parse(result) : result;

    return {
      title: data.metadata?.title || 'Untitled',
      description: data.metadata?.description || '',
      content: data.markdown?.substring(0, 8000) || '',
      thumbnail: data.metadata?.ogImage || null,
      metadata: {
        domain,
        favicon: data.metadata?.favicon || undefined,
        author: data.metadata?.author || undefined,
      },
    };
  },

  /**
   * Check if a URL is a YouTube video
   */
  isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com/watch') || url.includes('youtu.be/');
  },

  /**
   * Extract YouTube video ID from URL
   */
  extractYouTubeId(url: string): string {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    throw new Error('Invalid YouTube URL');
  },
};
