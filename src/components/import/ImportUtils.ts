
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

// Enhanced function to fetch YouTube transcript using our edge function
export const fetchYouTubeTranscript = async (videoId: string): Promise<string> => {
  try {
    console.log("Fetching transcript for video ID:", videoId);
    
    const { data, error } = await supabase.functions.invoke('fetch-youtube-transcript', {
      body: { 
        videoId,
        options: {
          includeTimestamps: true,
          language: 'en',
          format: 'text',
          maxRetries: 3
        }
      }
    });

    if (error) {
      console.error("Supabase function error:", error);
      throw new Error(`Failed to fetch transcript: ${error.message}`);
    }

    console.log("Raw response from edge function:", data);

    if (!data) {
      throw new Error("No response received from transcript service");
    }

    // Handle both success and error responses consistently
    if (data.success === false) {
      console.warn("Transcript fetch indicated failure:", data.error);
      return data.transcript || "No transcript available for this video. You can add your own notes here.";
    }

    // Check for valid transcript content
    if (data.transcript && typeof data.transcript === 'string') {
      const transcriptContent = data.transcript.trim();
      if (transcriptContent.length > 10) {
        console.log(`Successfully fetched transcript: ${transcriptContent.length} characters`);
        return transcriptContent;
      }
    }

    // Fallback for empty or invalid transcript
    console.warn("Transcript appears to be empty or invalid");
    return "No transcript content available for this video. You can add your own notes here.";
    
  } catch (error: any) {
    console.error("Error in fetchYouTubeTranscript:", error);
    
    // Return user-friendly error message
    if (error.message.includes('Failed to fetch transcript')) {
      return `Unable to fetch transcript: ${error.message}`;
    }
    
    return "Error fetching transcript. The video may not have captions available or may be restricted. You can add your own notes here.";
  }
};

// This function is kept for backward compatibility but now uses the real API
export const simulateTranscriptFetch = async (videoId: string): Promise<string> => {
  return fetchYouTubeTranscript(videoId);
};
