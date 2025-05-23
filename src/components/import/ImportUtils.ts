
import { supabase } from "@/integrations/supabase/client";

// Extract YouTube video ID from various YouTube URL formats
export const extractYouTubeId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Helper function to format timestamp from milliseconds to MM:SS
export const formatTimestamp = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Function to fetch YouTube transcript using our edge function
export const fetchYouTubeTranscript = async (videoId: string): Promise<string> => {
  try {
    // Add a short delay to ensure the function is ready (helpful for cold starts)
    await new Promise(resolve => setTimeout(resolve, 500));

    const { data, error } = await supabase.functions.invoke('fetch-youtube-transcript', {
      body: { videoId }
    });

    if (error) {
      console.error("Error fetching transcript:", error);
      throw new Error(`Failed to fetch transcript: ${error.message}`);
    }

    if (!data || !data.transcript) {
      return "No transcript available for this video.";
    }

    return data.transcript;
  } catch (error: any) {
    console.error("Error in fetchYouTubeTranscript:", error);
    // Return a user-friendly error message
    return `Error fetching transcript: ${error.message}`;
  }
};

// Function to process content with DeepSeek
export const processContentWithDeepSeek = async (content: string, type: string): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('process-content-with-deepseek', {
      body: { content, type }
    });

    if (error) {
      console.error("Error processing content:", error);
      throw new Error(`Failed to process content: ${error.message}`);
    }

    if (!data || !data.processedContent) {
      return "No processed content available.";
    }

    return data.processedContent;
  } catch (error: any) {
    console.error("Error in processContentWithDeepSeek:", error);
    // Return a user-friendly error message
    return `Error processing content: ${error.message}`;
  }
};

// This function is kept for backward compatibility but now uses the real API
export const simulateTranscriptFetch = async (videoId: string): Promise<string> => {
  return fetchYouTubeTranscript(videoId);
};
