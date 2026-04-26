import * as path from 'path';

export const getFullFileUrl = (path: string): string => {
  if (!path) return path;
  if (path.startsWith('http')) return path;
  const minioBaseUrl =
    process.env.MINIO_PUBLIC_URL || 'http://localhost:9000/party-documents';

  return `${minioBaseUrl}/${path}`;
};

export function sanitizeFileName(fileName: string): string {
  const ext = path.extname(fileName);
  const nameWithoutExt = path.basename(fileName, ext);

  const normalized = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'));

  const safeName = normalized
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return safeName || 'file';
}

export function generateSafeFileName(
  originalFileName: string,
  uuid?: string,
): string {
  const ext = path.extname(originalFileName);
  const safeName = sanitizeFileName(originalFileName);
  const timestamp = Date.now();

  if (uuid) {
    return `${safeName}_${timestamp}_${uuid}${ext}`;
  }

  return `${safeName}_${timestamp}${ext}`;
}
