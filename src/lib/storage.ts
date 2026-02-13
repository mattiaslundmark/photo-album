// Scaleway Object Storage (S3-compatible) operations

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  endpoint: process.env.SCW_ENDPOINT || 'https://s3.fr-par.scw.cloud',
  region: process.env.SCW_REGION || 'fr-par',
  credentials: {
    accessKeyId: process.env.SCW_ACCESS_KEY || '',
    secretAccessKey: process.env.SCW_SECRET_KEY || '',
  },
  // Use path-style for MinIO (localhost), virtual-hosted style for Scaleway
  forcePathStyle: process.env.SCW_ENDPOINT?.includes('localhost') ?? false,
});

const BUCKET_NAME = process.env.SCW_BUCKET_NAME || 'photo-album';

// Data files stored in the bucket
const DATA_PREFIX = 'data/';
const PHOTOS_PREFIX = 'photos/';
const THUMBNAILS_PREFIX = 'thumbnails/';

/**
 * Get an object from S3 storage
 */
export async function getObject(key: string): Promise<Buffer | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const response = await s3Client.send(command);

    if (response.Body) {
      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    }
    return null;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

/**
 * Put an object to S3 storage
 */
export async function putObject(
  key: string,
  body: Buffer | string,
  contentType: string = 'application/octet-stream'
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await s3Client.send(command);
}

/**
 * Delete an object from S3 storage
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  await s3Client.send(command);
}

/**
 * List objects with a given prefix
 */
export async function listObjects(prefix: string): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });
  const response = await s3Client.send(command);
  return (response.Contents || []).map((obj) => obj.Key || '').filter(Boolean);
}

/**
 * Get a presigned URL for downloading an object
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Get a presigned URL for uploading an object
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

// Helper functions for specific data types

/**
 * Get the key for a JSON data file
 */
export function getDataKey(filename: string): string {
  return `${DATA_PREFIX}${filename}`;
}

/**
 * Get the key for a full-size photo
 */
export function getPhotoKey(albumId: string, filename: string): string {
  return `${PHOTOS_PREFIX}${albumId}/${filename}`;
}

/**
 * Get the key for a thumbnail
 */
export function getThumbnailKey(albumId: string, filename: string): string {
  return `${THUMBNAILS_PREFIX}${albumId}/${filename}`;
}

/**
 * Get JSON data from storage
 */
export async function getJsonData<T>(filename: string): Promise<T | null> {
  const key = getDataKey(filename);
  const data = await getObject(key);
  if (data) {
    return JSON.parse(data.toString('utf-8')) as T;
  }
  return null;
}

/**
 * Save JSON data to storage
 */
export async function saveJsonData<T>(filename: string, data: T): Promise<void> {
  const key = getDataKey(filename);
  const jsonString = JSON.stringify(data, null, 2);
  await putObject(key, jsonString, 'application/json');
}

/**
 * Upload a photo to storage
 */
export async function uploadPhoto(
  albumId: string,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const key = getPhotoKey(albumId, filename);
  await putObject(key, buffer, contentType);
  return key;
}

/**
 * Upload a thumbnail to storage
 */
export async function uploadThumbnail(
  albumId: string,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const key = getThumbnailKey(albumId, filename);
  await putObject(key, buffer, contentType);
  return key;
}

/**
 * Delete a photo and its thumbnail from storage
 */
export async function deletePhoto(fullKey: string, thumbnailKey: string): Promise<void> {
  await Promise.all([
    deleteObject(fullKey),
    deleteObject(thumbnailKey),
  ]);
}

/**
 * Get public URL for an object (if bucket is public)
 */
export function getPublicUrl(key: string): string {
  const endpoint = process.env.SCW_ENDPOINT || 'https://s3.fr-par.scw.cloud';
  return `${endpoint}/${BUCKET_NAME}/${key}`;
}

export { s3Client, BUCKET_NAME };
