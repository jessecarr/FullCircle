// Utility function to load an image as base64 for print layouts
export async function loadImageAsBase64(imagePath: string): Promise<string | null> {
  try {
    // Ensure we have a full URL
    const fullPath = imagePath.startsWith('http') 
      ? imagePath 
      : `${window.location.origin}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
    
    console.log('Loading image from:', fullPath);
    
    const response = await fetch(fullPath, { 
      cache: 'no-store',
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      console.warn(`Failed to load image: ${fullPath} (status: ${response.status})`);
      return null;
    }
    
    const contentType = response.headers.get('content-type');
    console.log('Image content type:', contentType);
    
    const blob = await response.blob();
    console.log('Blob size:', blob.size, 'type:', blob.type);
    
    // If blob type is empty but we got data, try to use the content-type header
    const effectiveType = blob.type || contentType || 'image/png';
    
    // Verify it's actually an image
    if (!effectiveType.startsWith('image/')) {
      console.warn(`File is not an image: ${fullPath} (type: ${effectiveType})`);
      return null;
    }
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        console.log('Base64 result length:', result?.length, 'starts with:', result?.substring(0, 50));
        // Verify we got a valid data URL
        if (result && (result.startsWith('data:image/') || result.startsWith('data:application/octet-stream'))) {
          // If it's octet-stream, fix the mime type
          if (result.startsWith('data:application/octet-stream')) {
            const fixed = result.replace('data:application/octet-stream', 'data:image/png');
            resolve(fixed);
          } else {
            resolve(result);
          }
        } else {
          console.warn(`Invalid base64 result for: ${fullPath}`);
          resolve(null);
        }
      };
      reader.onerror = () => {
        console.warn(`FileReader error for: ${fullPath}`);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`Error loading image ${imagePath}:`, error);
    return null;
  }
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
