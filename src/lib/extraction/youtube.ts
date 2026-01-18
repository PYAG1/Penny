import { Innertube } from 'youtubei.js';
import { getSubtitles } from 'youtube-captions-scraper';
import { extractYouTubeId } from './web';
import { getErrorMessage } from '../../utils/error';

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
    const videoId = extractYouTubeId(url);
    console.log(`[YouTube] Extracting content for video ID: ${videoId}`);

    try {
      // Initialize YouTube InnerTube API for metadata
      const youtube = await Innertube.create();
      const info = await youtube.getInfo(videoId);

      // Extract metadata first
      const title = info.basic_info.title || 'Untitled Video';
      const channel = info.basic_info.channel?.name || info.basic_info.author || 'Unknown Channel';
      const thumbnails = info.basic_info.thumbnail;
      const thumbnail = thumbnails && thumbnails.length > 0
        ? thumbnails[thumbnails.length - 1].url
        : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      // Try to fetch transcript using youtube-captions-scraper (more reliable)
      let transcriptText = '';
      try {
        console.log(`[YouTube] Fetching captions for ${videoId}...`);
        const captions = await getSubtitles({
          videoID: videoId,
          lang: 'en' // Try English first
        });

        if (captions && captions.length > 0) {
          transcriptText = captions.map((caption: any) => caption.text).join(' ');
          console.log(`[YouTube] ✓ Captions fetched: ${transcriptText.length} chars from ${captions.length} segments`);
        }
      } catch (captionError: unknown) {
        console.warn(`[YouTube] Captions scraper failed:`, getErrorMessage(captionError));

        // Fallback 1: Try youtubei.js transcript API
        try {
          console.log(`[YouTube] Trying youtubei.js transcript fallback...`);
          const transcriptData = await info.getTranscript();

          if (transcriptData && transcriptData.transcript) {
            const segments = transcriptData.transcript.content?.body?.initial_segments;
            if (segments && Array.isArray(segments)) {
              transcriptText = segments
                .map((segment: any) => segment.snippet?.text?.toString() || '')
                .filter(Boolean)
                .join(' ');
              console.log(`[YouTube] ✓ Youtubei transcript: ${transcriptText.length} chars`);
            }
          }
        } catch (innertubeError: unknown) {
          console.warn(`[YouTube] Youtubei transcript also failed:`, getErrorMessage(innertubeError));
        }
      }

      // Fallback 2: Use video description if no transcript available
      if (!transcriptText || transcriptText.length < 100) {
        console.warn(`[YouTube] No transcript available for ${videoId}, using description`);
        transcriptText = info.basic_info.short_description || 'No transcript available for this video.';
        console.log(`[YouTube] Using description: ${transcriptText.length} chars`);
      }

      return {
        title,
        description: transcriptText.substring(0, 500),
        content: transcriptText,
        thumbnail,
        metadata: {
          domain: 'youtube.com',
          channel,
          videoId,
        },
      };
    } catch (error: unknown) {
      console.error(`[YouTube] Failed to extract content for ${videoId}:`, error);
      throw new Error(`Failed to fetch YouTube video: ${getErrorMessage(error)}`);
    }
  },
};
