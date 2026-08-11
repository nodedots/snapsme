/**
 * SnapSME — Client-Side Image Compression
 *
 * Compresses receipt images before upload to reduce bandwidth and storage
 * costs (per NFR: "receipt images compressed client-side before upload").
 *
 * Uses the Canvas API to downscale and re-encode images as JPEG.
 */

/**
 * Compresses an image file to a target max dimension and quality.
 *
 * @param {File} file - The image file to compress
 * @param {object} [options]
 * @param {number} [options.maxWidth=1600] - Max width in pixels
 * @param {number} [options.maxHeight=1600] - Max height in pixels
 * @param {number} [options.quality=0.7] - JPEG quality (0.0 - 1.0)
 * @param {number} [options.maxSizeMB=2] - Max output size in MB (re-encodes if larger)
 * @returns {Promise<{ blob: Blob, dataUrl: string, width: number, height: number, originalSize: number, compressedSize: number }>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.7,
    maxSizeMB = 2
  } = options;

  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file.");
  }

  const originalSize = file.size;

  // Load the image first so we can still downscale huge-dimension JPEGs
  // even when file size is already under maxSizeMB (common with phone photos).
  const image = await loadImage(file);

  // Calculate new dimensions while preserving aspect ratio
  let { width, height } = image;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  // Skip re-encode only when already JPEG, under size cap, AND within max dimensions
  if (
    file.size <= maxSizeMB * 1024 * 1024 &&
    file.type === "image/jpeg" &&
    scale >= 1
  ) {
    const dataUrl = await fileToDataUrl(file);
    return {
      blob: file,
      dataUrl,
      width: image.width,
      height: image.height,
      originalSize,
      compressedSize: file.size,
      skipped: true
    };
  }

  // Draw to canvas and export as JPEG
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, "image/jpeg", quality);

  // If still too large, progressively reduce quality
  let currentQuality = quality;
  while (blob.size > maxSizeMB * 1024 * 1024 && currentQuality > 0.3) {
    currentQuality -= 0.1;
    blob = await canvasToBlob(canvas, "image/jpeg", currentQuality);
  }

  const dataUrl = await blobToDataUrl(blob);

  return {
    blob,
    dataUrl,
    width,
    height,
    originalSize,
    compressedSize: blob.size,
    quality: currentQuality,
    skipped: false
  };
}

/**
 * Loads an image file into an HTMLImageElement.
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image."));
    };
    img.src = url;
  });
}

/**
 * Converts a canvas to a Blob.
 */
function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to encode image."));
      },
      type,
      quality
    );
  });
}

/**
 * Converts a File to a data URL.
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a Blob to a data URL.
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read blob."));
    reader.readAsDataURL(blob);
  });
}