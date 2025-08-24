// lib/gcs-utils.ts
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: {
    client_email: process.env.GCS_CLIENT_EMAIL,
    private_key: process.env.GCS_PRIVATE_KEY?.split(String.raw`\n`).join('\n'),
  },
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);

export { storage, bucket };

// Helper function to generate public URL
export const getPublicUrl = (fileName: string): string => {
  return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`;
};

// Helper function to extract filename from GCS URL
export const extractFilenameFromGCSUrl = (url: string): string | null => {
  try {
    const bucketName = process.env.GCS_BUCKET_NAME;
    const baseUrl = `https://storage.googleapis.com/${bucketName}/`;
    
    if (url.startsWith(baseUrl)) {
      return url.replace(baseUrl, '');
    }
    
    // Alternative format: https://storage.cloud.google.com/bucket-name/filename
    const altBaseUrl = `https://storage.cloud.google.com/${bucketName}/`;
    if (url.startsWith(altBaseUrl)) {
      return url.replace(altBaseUrl, '');
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting filename from GCS URL:', error);
    return null;
  }
};
