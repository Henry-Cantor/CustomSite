import { VercelRequest, VercelResponse } from '@vercel/node';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
dotenv.config({ override: true });

// Initialize R2 (S3-compatible)
const s3 = new AWS.S3({
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { file } = req.query;

    // Map friendly names to R2 keys
    const files: Record<string, string> = {
        //1.0-mac.zip
      mac: 'CustoMLearning-1.0.0-arm64.dmg',
      windows: 'example4.zip',
      linux: 'example4.zip',
      example4: 'example4.zip', // <-- extra dataset
    };

    const fileName = files[(file as string)?.toLowerCase()];
    if (!fileName) return res.status(400).json({ error: 'Invalid file requested' });

    const bucket = process.env.R2_BUCKET;
    if (!bucket) return res.status(500).json({ error: 'R2_BUCKET not set' });

    // Generate signed URL
    const url = s3.getSignedUrl('getObject', {
      Bucket: bucket,
      Key: fileName,
      Expires: 1800, // URL valid for 5 minutes
    });

    res.status(200).json({ url });
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
