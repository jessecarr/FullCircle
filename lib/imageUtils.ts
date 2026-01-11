// Utility function to load an image as base64 for print layouts
export async function loadImageAsBase64(imagePath: string): Promise<string | null> {
  try {
    const response = await fetch(imagePath);
    if (!response.ok) {
      console.warn(`Failed to load image: ${imagePath}`);
      return null;
    }
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`Error loading image ${imagePath}:`, error);
    return null;
  }
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
