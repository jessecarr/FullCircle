// Utility function to load an image as base64 for print layouts
// Uses Image element to ensure the image is actually loaded before converting
export async function loadImageAsBase64(imagePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      // Ensure we have a full URL
      const fullPath = imagePath.startsWith('http') 
        ? imagePath 
        : `${window.location.origin}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // Create canvas and draw image
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.warn('Could not get canvas context');
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          
          // Convert to base64
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (e) {
          console.warn('Canvas conversion failed:', e);
          resolve(null);
        }
      };
      
      img.onerror = () => {
        console.warn(`Failed to load image: ${fullPath}`);
        resolve(null);
      };
      
      // Add timestamp to bypass cache
      img.src = fullPath + '?t=' + Date.now();
    } catch (error) {
      console.warn(`Error loading image ${imagePath}:`, error);
      resolve(null);
    }
  });
}

// Get the full URL for an image (for use in print where base64 fails)
export function getImageUrl(imagePath: string): string {
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  return `${window.location.origin}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}

// Preload multiple images and return a map of path -> base64
export async function preloadImages(imagePaths: string[]): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();
  
  await Promise.all(
    imagePaths.map(async (path) => {
      const base64 = await loadImageAsBase64(path);
      if (base64) {
        imageMap.set(path, base64);
      }
    })
  );
  
  return imageMap;
}
