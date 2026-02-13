// Data types for the photo album application

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'viewer';
  createdAt: string;
}

export interface Album {
  id: string;
  title: string;
  description: string;
  slug: string;
  coverPhotoId: string | null;
  isPublic: boolean;
  allowedUsers: string[]; // user IDs who can view private albums
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  albumId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  thumbnailKey: string;
  fullKey: string;
  caption: string;
  sortOrder: number;
  uploadedAt: string;
}

export interface AlbumsData {
  albums: Album[];
}

export interface PhotosData {
  photos: Photo[];
}

export interface UsersData {
  users: User[];
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: 'admin' | 'viewer';
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
