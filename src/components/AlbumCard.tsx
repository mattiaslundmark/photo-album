'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Album {
  id: string;
  title: string;
  description: string;
  slug: string;
  coverPhotoId: string | null;
  isPublic: boolean;
}

interface AlbumCardProps {
  album: Album;
  coverUrl?: string;
  photoCount?: number;
}

export default function AlbumCard({ album, coverUrl, photoCount }: AlbumCardProps) {
  return (
    <Link
      href={`/album/${album.slug}`}
      className="group block relative aspect-square overflow-hidden bg-gray-900"
    >
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={album.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600">
          <svg
            className="w-16 h-16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/30 group-hover:bg-white/20 transition-all duration-300" />

      {/* Title overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <h1 className="text-white/90 font-bold text-3xl text-center px-4">
          {album.title}
        </h1>
      </div>

      {/* Private badge */}
      {!album.isPublic && (
        <div className="absolute top-3 right-3">
          <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">
            Private
          </span>
        </div>
      )}
    </Link>
  );
}
