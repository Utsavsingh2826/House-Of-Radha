/**
 * Injects Cloudinary optimization transformations into a raw secure URL.
 * Example transformations:
 *   - f_auto (auto-select WebP/AVIF formats depending on browser support)
 *   - q_auto (optimally compress image with minimal visual loss)
 *   - w_XXX, h_XXX (resizes image on the fly)
 */
export const getOptimizedImageUrl = (url, width, height) => {
  if (!url) return '';

  // If it's not a Cloudinary image URL, return as-is (e.g. local assets or unsplash)
  if (!url.includes('res.cloudinary.com')) return url;

  // Split URL to insert transformations right after '/upload'
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const prefix = url.substring(0, uploadIndex + 8);
  const suffix = url.substring(uploadIndex + 8);

  // Compile transformation string
  let transformations = 'f_auto,q_auto';
  if (width) transformations += `,w_${width}`;
  if (height) transformations += `,h_${height},c_fill`; // crop fill

  return `${prefix}${transformations}/${suffix}`;
};
