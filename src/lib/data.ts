// Data management layer for JSON files stored in S3

import { getJsonData, saveJsonData } from './storage';
import type {
  Album,
  AlbumsData,
  Photo,
  PhotosData,
  User,
  UsersData,
} from './types';

// File names for JSON data
const ALBUMS_FILE = 'albums.json';
const PHOTOS_FILE = 'photos.json';
const USERS_FILE = 'users.json';

// Default empty data structures
const DEFAULT_ALBUMS_DATA: AlbumsData = { albums: [] };
const DEFAULT_PHOTOS_DATA: PhotosData = { photos: [] };
const DEFAULT_USERS_DATA: UsersData = { users: [] };

// ==================== Albums ====================

export async function getAlbums(): Promise<Album[]> {
  const data = await getJsonData<AlbumsData>(ALBUMS_FILE);
  return data?.albums || DEFAULT_ALBUMS_DATA.albums;
}

export async function getAlbumById(id: string): Promise<Album | null> {
  const albums = await getAlbums();
  return albums.find((album) => album.id === id) || null;
}

export async function getAlbumBySlug(slug: string): Promise<Album | null> {
  const albums = await getAlbums();
  return albums.find((album) => album.slug === slug) || null;
}

export async function getPublicAlbums(): Promise<Album[]> {
  const albums = await getAlbums();
  return albums.filter((album) => album.isPublic);
}

export async function getAlbumsForUser(userId: string | null): Promise<Album[]> {
  const albums = await getAlbums();
  if (!userId) {
    // Return only public albums for anonymous users
    return albums.filter((album) => album.isPublic);
  }
  // Return public albums and albums where user has access
  return albums.filter(
    (album) => album.isPublic || album.allowedUsers.includes(userId)
  );
}

export async function createAlbum(album: Album): Promise<Album> {
  const albums = await getAlbums();
  albums.push(album);
  await saveJsonData(ALBUMS_FILE, { albums });
  return album;
}

export async function updateAlbum(
  id: string,
  updates: Partial<Album>
): Promise<Album | null> {
  const albums = await getAlbums();
  const index = albums.findIndex((album) => album.id === id);
  if (index === -1) return null;

  albums[index] = {
    ...albums[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await saveJsonData(ALBUMS_FILE, { albums });
  return albums[index];
}

export async function deleteAlbum(id: string): Promise<boolean> {
  const albums = await getAlbums();
  const filtered = albums.filter((album) => album.id !== id);
  if (filtered.length === albums.length) return false;

  await saveJsonData(ALBUMS_FILE, { albums: filtered });
  return true;
}

// ==================== Photos ====================

export async function getPhotos(): Promise<Photo[]> {
  const data = await getJsonData<PhotosData>(PHOTOS_FILE);
  return data?.photos || DEFAULT_PHOTOS_DATA.photos;
}

export async function getPhotoById(id: string): Promise<Photo | null> {
  const photos = await getPhotos();
  return photos.find((photo) => photo.id === id) || null;
}

export async function getPhotosByAlbumId(albumId: string): Promise<Photo[]> {
  const photos = await getPhotos();
  return photos
    .filter((photo) => photo.albumId === albumId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createPhoto(photo: Photo): Promise<Photo> {
  const photos = await getPhotos();
  photos.push(photo);
  await saveJsonData(PHOTOS_FILE, { photos });
  return photo;
}

export async function updatePhoto(
  id: string,
  updates: Partial<Photo>
): Promise<Photo | null> {
  const photos = await getPhotos();
  const index = photos.findIndex((photo) => photo.id === id);
  if (index === -1) return null;

  photos[index] = { ...photos[index], ...updates };
  await saveJsonData(PHOTOS_FILE, { photos });
  return photos[index];
}

export async function deletePhotoData(id: string): Promise<boolean> {
  const photos = await getPhotos();
  const filtered = photos.filter((photo) => photo.id !== id);
  if (filtered.length === photos.length) return false;

  await saveJsonData(PHOTOS_FILE, { photos: filtered });
  return true;
}

export async function deletePhotosByAlbumId(albumId: string): Promise<Photo[]> {
  const photos = await getPhotos();
  const toDelete = photos.filter((photo) => photo.albumId === albumId);
  const remaining = photos.filter((photo) => photo.albumId !== albumId);

  await saveJsonData(PHOTOS_FILE, { photos: remaining });
  return toDelete;
}

export async function reorderPhotos(
  albumId: string,
  photoIds: string[]
): Promise<void> {
  const photos = await getPhotos();
  const albumPhotos = photos.filter((p) => p.albumId === albumId);
  const otherPhotos = photos.filter((p) => p.albumId !== albumId);

  // Update sort order based on the new order
  const updatedAlbumPhotos = albumPhotos.map((photo) => {
    const newOrder = photoIds.indexOf(photo.id);
    return {
      ...photo,
      sortOrder: newOrder >= 0 ? newOrder : photo.sortOrder,
    };
  });

  await saveJsonData(PHOTOS_FILE, { photos: [...otherPhotos, ...updatedAlbumPhotos] });
}

// ==================== Users ====================

export async function getUsers(): Promise<User[]> {
  const data = await getJsonData<UsersData>(USERS_FILE);
  return data?.users || DEFAULT_USERS_DATA.users;
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((user) => user.id === id) || null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((user) => user.username === username) || null;
}

export async function createUser(user: User): Promise<User> {
  const users = await getUsers();

  // Check if username already exists
  if (users.some((u) => u.username === user.username)) {
    throw new Error('Username already exists');
  }

  users.push(user);
  await saveJsonData(USERS_FILE, { users });
  return user;
}

export async function updateUser(
  id: string,
  updates: Partial<User>
): Promise<User | null> {
  const users = await getUsers();
  const index = users.findIndex((user) => user.id === id);
  if (index === -1) return null;

  users[index] = { ...users[index], ...updates };
  await saveJsonData(USERS_FILE, { users });
  return users[index];
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = await getUsers();
  const filtered = users.filter((user) => user.id !== id);
  if (filtered.length === users.length) return false;

  await saveJsonData(USERS_FILE, { users: filtered });
  return true;
}

// ==================== Utility Functions ====================

/**
 * Initialize default data files if they don't exist
 */
export async function initializeDataFiles(): Promise<void> {
  const [albums, photos, users] = await Promise.all([
    getJsonData<AlbumsData>(ALBUMS_FILE),
    getJsonData<PhotosData>(PHOTOS_FILE),
    getJsonData<UsersData>(USERS_FILE),
  ]);

  const initPromises: Promise<void>[] = [];

  if (!albums) {
    initPromises.push(saveJsonData(ALBUMS_FILE, DEFAULT_ALBUMS_DATA));
  }
  if (!photos) {
    initPromises.push(saveJsonData(PHOTOS_FILE, DEFAULT_PHOTOS_DATA));
  }
  if (!users) {
    initPromises.push(saveJsonData(USERS_FILE, DEFAULT_USERS_DATA));
  }

  await Promise.all(initPromises);
}

/**
 * Check if user has access to an album
 */
export async function userCanAccessAlbum(
  albumId: string,
  userId: string | null
): Promise<boolean> {
  const album = await getAlbumById(albumId);
  if (!album) return false;
  if (album.isPublic) return true;
  if (!userId) return false;
  return album.allowedUsers.includes(userId);
}
