import { YoutubeTranscript } from 'youtube-transcript';
import { webExtractionService } from './web-extraction.service';
import { getErrorMessage } from '../utils/error';

export interface YouTubeContent {
  title: string;
  description: string;
  content: string;
  thumbnail: string;
  metadata: {
    domain: string;
    channel: string;
    videoId: string;
  };
}

export const youtubeExtractionService = {
  /**
   * Extract content from a YouTube video including transcript
   */
  async extractContent(url: string): Promise<YouTubeContent> {
    const videoId = webExtractionService.extractYouTubeId(url);

    // Fetch transcript
    let transcriptText = '';
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      transcriptText = transcript.map((item) => item.text).join(' ');
    } catch (error: unknown) {
      console.warn(`[YouTube] Transcript not available for ${videoId}:`, getErrorMessage(error));
      transcriptText = 'Transcript not available for this video.';
    }

    // Fetch video metadata via oEmbed (no API key needed)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const metadataRes = await fetch(oembedUrl);

    if (!metadataRes.ok) {
      throw new Error(`Failed to fetch YouTube metadata: ${metadataRes.statusText}`);
    }

    const oembedData = await metadataRes.json();

    return {
      title: oembedData.title || 'Untitled Video',
      description: transcriptText.substring(0, 500),
      content: transcriptText,
      thumbnail: oembedData.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      metadata: {
        domain: 'youtube.com',
        channel: oembedData.author_name || 'Unknown Channel',
        videoId,
      },
    };
  },
};
