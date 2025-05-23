
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
    console.log("Calling fetch-youtube-transcript edge function with videoId:", videoId);
    
    const { data, error } = await supabase.functions.invoke('fetch-youtube-transcript', {
      body: { videoId }
    });

    if (error) {
      console.error("Error from edge function:", error);
      throw new Error(`Failed to fetch transcript: ${error.message}`);
    }

    console.log("Response from edge function:", data);

    if (!data) {
      return "No response received from transcript service.";
    }

    // Check if the response contains an error
    if (data.error) {
      console.error("Error in transcript response:", data.error);
      return `Error fetching transcript: ${data.error}`;
    }

    // Return the transcript or a fallback message
    return data.transcript || "No transcript content available for this video.";
    
  } catch (error: any) {
    console.error("Error in fetchYouTubeTranscript:", error);
    // Return a user-friendly error message
    return `Error fetching transcript: ${error.message}`;
  }
};

// This function is kept for backward compatibility but now uses the real API
export const simulateTranscriptFetch = async (videoId: string): Promise<string> => {
  return fetchYouTubeTranscript(videoId);
};
