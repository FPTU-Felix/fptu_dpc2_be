export const getFullFileUrl = (path: string): string => {
  if (!path) return path;
  if (path.startsWith('http')) return path;
  const minioBaseUrl =
    process.env.MINIO_PUBLIC_URL || 'http://localhost:9000/party-documents';

  return `${minioBaseUrl}/${path}`;
};
