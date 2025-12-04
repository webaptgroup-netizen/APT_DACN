import { v4 as uuid } from 'uuid';
import { supabase } from '../../config/supabase';
import { env } from '../../config/env';
import { AppError } from '../../utils/appError';

const bucket = env.SUPABASE_STORAGE_BUCKET;
const publicStorageBaseUrl = `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}`;

const guessExtension = (contentType?: string, fileName?: string) => {
  if (fileName && fileName.includes('.')) {
    return fileName.split('.').pop();
  }

  switch (contentType) {
    // Images
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    // Videos
    case 'video/mp4':
      return 'mp4';
    case 'video/webm':
      return 'webm';
    case 'video/ogg':
      return 'ogv';
    case 'video/quicktime':
      return 'mov';
    default:
      return 'bin';
  }
};

const normalizeBase64 = (
  value: string
): {
  contentType?: string;
  base64: string;
} => {
  const match = value.match(/^data:(.+);base64,(.*)$/);
  if (match) {
    const mime = match[1] ?? 'application/octet-stream';
    const data = match[2] ?? '';
    return {
      contentType: mime,
      base64: data
    };
  }

  return {
    base64: value
  };
};

export interface UploadImageInput {
  base64: string;
  folder?: string;
  fileName?: string;
}

export const uploadBase64Image = async ({ base64, folder = 'misc', fileName }: UploadImageInput) => {
  const { contentType, base64: normalized } = normalizeBase64(base64);
  const buffer = Buffer.from(normalized, 'base64');

  if (!buffer.length) {
    throw new AppError('Invalid image payload', 400);
  }

  const extension = guessExtension(contentType, fileName);
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '');
  const generatedName = fileName?.replace(/\.[^/.]+$/, '') || uuid();
  const path = `${safeFolder}/${generatedName}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: contentType ?? 'application/octet-stream',
    upsert: false
  });

  if (error) {
    throw new AppError('Failed to upload file to Supabase Storage', 500, error);
  }

  const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    path,
    url: publicUrl.publicUrl
  };
};

export const deleteFile = async (path: string) => {
  if (!path) {
    throw new AppError('Missing storage path', 400);
  }

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new AppError('Failed to delete file in Supabase Storage', 500, error);
  }
};

export interface ThreeDAsset {
  name: string;
  path: string;
  url: string;
}

export const listThreeDAssets = async (): Promise<ThreeDAsset[]> => {
  const { data, error } = await supabase.storage.from(bucket).list('3D', {
    limit: 200,
    sortBy: { column: 'name', order: 'asc' }
  });

  if (error) {
    throw new AppError('Failed to list 3D assets', 500, error);
  }

  if (!data?.length) {
    return [];
  }

  return data
    .filter((item) => item.name.toLowerCase().endsWith('.glb'))
    .map((item) => {
      const path = `3D/${item.name}`;
      const url = `${publicStorageBaseUrl}/${path}`;

      return {
        name: item.name,
        path,
        url
      };
    });
};
