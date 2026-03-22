export default () => ({
    minio: {
      endPoint: process.env.MINIO_ENDPOINT || "localhost",
      port: Number(process.env.MINIO_PORT || 9000),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY || "",
      secretKey: process.env.MINIO_SECRET_KEY || "",
      bucket: process.env.MINIO_BUCKET || "party-documents",
      publicUrl: process.env.MINIO_PUBLIC_URL || "http://localhost:9000",
    },
  });