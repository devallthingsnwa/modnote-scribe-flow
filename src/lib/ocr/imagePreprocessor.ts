
export interface PreprocessingOptions {
  denoise: boolean;
  binarize: boolean;
  deskew: boolean;
  enhance: boolean;
}

export class ImagePreprocessor {
  static async preprocessImage(
    imageData: ArrayBuffer, 
    options: PreprocessingOptions
  ): Promise<ArrayBuffer> {
    console.log('Applying image preprocessing');
    
    // Create canvas for image processing
    const blob = new Blob([imageData]);
    const imageUrl = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Apply preprocessing based on options
        if (options.enhance) {
          this.enhanceContrast(ctx, canvas.width, canvas.height);
        }
        
        if (options.binarize) {
          this.binarizeImage(ctx, canvas.width, canvas.height);
        }
        
        if (options.denoise) {
          this.denoiseImage(ctx, canvas.width, canvas.height);
        }
        
        // Convert back to ArrayBuffer
        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then(resolve).catch(reject);
          } else {
            reject(new Error('Failed to process image'));
          }
        }, 'image/png');
        
        URL.revokeObjectURL(imageUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }
  
  private static enhanceContrast(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Simple contrast enhancement
    const factor = 1.5; // Contrast factor
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, (data[i] - 128) * factor + 128);     // Red
      data[i + 1] = Math.min(255, (data[i + 1] - 128) * factor + 128); // Green
      data[i + 2] = Math.min(255, (data[i + 2] - 128) * factor + 128); // Blue
    }
    
    ctx.putImageData(imageData, 0, 0);
  }
  
  private static binarizeImage(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Convert to grayscale and apply threshold
    const threshold = 128;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const binary = gray > threshold ? 255 : 0;
      
      data[i] = binary;     // Red
      data[i + 1] = binary; // Green
      data[i + 2] = binary; // Blue
    }
    
    ctx.putImageData(imageData, 0, 0);
  }
  
  private static denoiseImage(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);
    
    // Simple 3x3 median filter for denoising
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels
          const neighbors = [];
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const idx = ((y + dy) * width + (x + dx)) * 4 + c;
              neighbors.push(data[idx]);
            }
          }
          
          neighbors.sort((a, b) => a - b);
          const median = neighbors[4]; // Middle value of 9 elements
          
          const idx = (y * width + x) * 4 + c;
          newData[idx] = median;
        }
      }
    }
    
    const processedImageData = new ImageData(newData, width, height);
    ctx.putImageData(processedImageData, 0, 0);
  }
}
