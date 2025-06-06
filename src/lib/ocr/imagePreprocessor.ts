
export interface PreprocessingOptions {
  denoise?: boolean;
  binarize?: boolean;
  deskew?: boolean;
  enhance?: boolean;
}

export class ImagePreprocessor {
  static async preprocessImage(
    imageBlob: Blob, 
    options: PreprocessingOptions = {}
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Load image
    const img = await this.loadImage(imageBlob);
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Apply preprocessing steps
    if (options.denoise) {
      imageData = this.denoise(imageData);
    }

    if (options.enhance) {
      imageData = this.enhanceContrast(imageData);
    }

    if (options.binarize) {
      imageData = this.binarize(imageData);
    }

    if (options.deskew) {
      // Simple deskew implementation
      imageData = this.deskew(imageData, canvas);
    }

    // Put processed image back to canvas
    ctx.putImageData(imageData, 0, 0);

    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else throw new Error('Failed to create processed image blob');
      }, 'image/png', 1.0);
    });
  }

  private static loadImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  private static denoise(imageData: ImageData): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const newData = new Uint8ClampedArray(data);

    // Simple median filter for denoising
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
          const median = neighbors[Math.floor(neighbors.length / 2)];
          newData[(y * width + x) * 4 + c] = median;
        }
      }
    }

    return new ImageData(newData, width, height);
  }

  private static enhanceContrast(imageData: ImageData): ImageData {
    const data = imageData.data;
    const factor = 1.5; // Contrast enhancement factor

    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast enhancement to RGB channels
      for (let c = 0; c < 3; c++) {
        let value = data[i + c];
        value = ((value / 255 - 0.5) * factor + 0.5) * 255;
        data[i + c] = Math.max(0, Math.min(255, value));
      }
    }

    return imageData;
  }

  private static binarize(imageData: ImageData): ImageData {
    const data = imageData.data;
    
    // Calculate threshold using Otsu's method (simplified)
    const histogram = new Array(256).fill(0);
    const total = imageData.width * imageData.height;

    // Build histogram
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      histogram[gray]++;
    }

    // Find optimal threshold
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maximum = 0.0;
    let threshold = 0;

    for (let i = 0; i < 256; i++) {
      wB += histogram[i];
      if (wB === 0) continue;

      wF = total - wB;
      if (wF === 0) break;

      sumB += i * histogram[i];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);

      if (between > maximum) {
        maximum = between;
        threshold = i;
      }
    }

    // Apply binarization
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const binary = gray > threshold ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = binary;
    }

    return imageData;
  }

  private static deskew(imageData: ImageData, canvas: HTMLCanvasElement): ImageData {
    // Simple rotation correction (basic implementation)
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageData;

    // This is a simplified deskew - in production you'd want more sophisticated angle detection
    const angle = 0; // Would calculate skew angle here
    
    if (Math.abs(angle) > 0.1) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(angle);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      ctx.putImageData(imageData, 0, 0);
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    return imageData;
  }
}
