// Image processing utilities using sharp

import sharp from 'sharp';

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 400;
const FULL_MAX_WIDTH = 2000;
const FULL_MAX_HEIGHT = 2000;
const JPEG_QUALITY = 85;

export interface ProcessedImage {
  full: Buffer;
  thumbnail: Buffer;
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
}

/**
 * Process an uploaded image - resize full image and create thumbnail
 */
export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  // Use rotate() to auto-orient based on EXIF data
  const image = sharp(buffer).rotate();
  const metadata = await image.metadata();

  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  // Process full-size image (resize if too large)
  let fullImage = image.clone();
  let fullWidth = originalWidth;
  let fullHeight = originalHeight;

  if (originalWidth > FULL_MAX_WIDTH || originalHeight > FULL_MAX_HEIGHT) {
    fullImage = fullImage.resize(FULL_MAX_WIDTH, FULL_MAX_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    });
    const fullMetadata = await fullImage.clone().toBuffer({ resolveWithObject: true });
    fullWidth = fullMetadata.info.width;
    fullHeight = fullMetadata.info.height;
  }

  const fullBuffer = await fullImage
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  // Create thumbnail (cover fit to square, then crop)
  const thumbnailBuffer = await sharp(buffer)
    .rotate() // Auto-orient based on EXIF
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  return {
    full: fullBuffer,
    thumbnail: thumbnailBuffer,
    width: fullWidth,
    height: fullHeight,
    thumbnailWidth: THUMBNAIL_WIDTH,
    thumbnailHeight: THUMBNAIL_HEIGHT,
  };
}

/**
 * Get image dimensions from a buffer
 */
export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

/**
 * Validate that a buffer is a valid image
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return (
      metadata.format !== undefined &&
      ['jpeg', 'png', 'webp', 'gif', 'avif'].includes(metadata.format)
    );
  } catch {
    return false;
  }
}

/**
 * Get the mime type for an image buffer
 */
export async function getImageMimeType(buffer: Buffer): Promise<string | null> {
  try {
    const metadata = await sharp(buffer).metadata();
    const formatMap: Record<string, string> = {
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      avif: 'image/avif',
    };
    return metadata.format ? formatMap[metadata.format] || null : null;
  } catch {
    return null;
  }
}
