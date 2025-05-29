
export class AudioUtils {
  static async convertBlobToBase64(audioBlob: Blob): Promise<string> {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      if (uint8Array.length === 0) {
        throw new Error('Empty audio data');
      }
      
      // Convert to base64 in chunks to handle large files
      let binary = '';
      const chunkSize = 0x8000; // 32KB chunks
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      return btoa(binary);
    } catch (error) {
      console.error("Base64 conversion error:", error);
      throw new Error('Failed to process audio data');
    }
  }
}
