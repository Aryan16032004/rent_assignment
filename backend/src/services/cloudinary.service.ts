import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

export type MediaType = 'image' | 'video';

export interface UploadedMedia {
  url: string;
  publicId: string;
  mediaType: MediaType;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
}

const configured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);

if (configured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

export function isCloudinaryConfigured(): boolean {
  return configured;
}

function assertConfigured(): void {
  if (!configured) {
    throw new HttpError(
      503,
      'Media uploads are not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'
    );
  }
}

function thumbnailFor(publicId: string): string {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [{ start_offset: '0' }],
    secure: true
  });
}

function mapResult(result: UploadApiResponse, mediaType: MediaType): UploadedMedia {
  return {
    url: result.secure_url,
    publicId: result.public_id,
    mediaType,
    thumbnailUrl: mediaType === 'video' ? thumbnailFor(result.public_id) : null,
    width: result.width ?? null,
    height: result.height ?? null,
    duration: result.duration ?? null
  };
}

export function uploadBuffer(buffer: Buffer, mediaType: MediaType): Promise<UploadedMedia> {
  assertConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: mediaType,
        folder: env.CLOUDINARY_UPLOAD_FOLDER,
        use_filename: true,
        unique_filename: true,
        overwrite: false
      },
      (error, result) => {
        if (error || !result) {
          reject(new HttpError(502, `Cloudinary upload failed: ${error?.message ?? 'Unknown error'}`));
          return;
        }
        resolve(mapResult(result, mediaType));
      }
    );

    stream.end(buffer);
  });
}

export async function uploadRemote(
  url: string,
  mediaType: MediaType
): Promise<UploadedMedia> {
  assertConfigured();

  const result = await cloudinary.uploader.upload(url, {
    resource_type: mediaType,
    folder: `${env.CLOUDINARY_UPLOAD_FOLDER}/seed`,
    use_filename: true,
    unique_filename: true,
    overwrite: false
  });

  return mapResult(result, mediaType);
}

export async function deleteMedia(
  publicId: string,
  mediaType: MediaType = 'image'
): Promise<void> {
  if (!configured || !publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: mediaType,
      invalidate: true
    });
  } catch (error) {
    console.warn('Unable to delete Cloudinary asset', publicId, error);
  }
}

export function mediaTypeFromMime(mime: string): MediaType | null {
  if (mime.startsWith('image/')) {
    return 'image';
  }
  if (mime.startsWith('video/')) {
    return 'video';
  }
  return null;
}
