
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

// This function simulates fetching a transcript
export const simulateTranscriptFetch = async (videoId: string) => {
  // Return a simulated transcript after a short delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Create a realistic-looking simulated transcript with timestamps
  const lines = [
    { offset: 0, text: "Welcome to this video where we'll be discussing key concepts." },
    { offset: 5000, text: "Today's topic is about improving productivity and time management." },
    { offset: 10000, text: "Let's start by looking at the most important principles." },
    { offset: 15000, text: "First, identify your most productive hours during the day." },
    { offset: 20000, text: "Second, break down large tasks into smaller, manageable pieces." },
    { offset: 25000, text: "Third, eliminate distractions during your focused work time." },
    { offset: 30000, text: "Fourth, take regular breaks to maintain high productivity." },
    { offset: 35000, text: "Fifth, use tools and apps that help you stay organized." },
    { offset: 40000, text: "Sixth, prioritize tasks based on importance and urgency." },
    { offset: 45000, text: "Seventh, learn to delegate when appropriate." },
    { offset: 50000, text: "Eighth, reflect on your productivity at the end of each day." },
    { offset: 55000, text: "Ninth, adjust your approach based on what works best for you." },
    { offset: 60000, text: "And finally, be patient with yourself as you develop new habits." },
    { offset: 65000, text: "Let's now dive deeper into each of these principles." },
    { offset: 70000, text: "Remember, consistency is key when implementing these strategies." },
    { offset: 75000, text: "Thanks for watching this video. Don't forget to subscribe!" }
  ];
  
  // Join all transcript pieces and format them
  return lines.map(item => `[${formatTimestamp(item.offset)}] ${item.text}`).join('\n');
};
