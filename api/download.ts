import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { platform } = req.query;

  // Map friendly platform names to actual file names
  const files: Record<string, string> = {
    mac: '1.0-mac.zip',
    windows: '1.0-win.zip',
    linux: '1.0-linux.zip',
  };

  const fileName = files[(platform as string)?.toLowerCase()];
  if (!fileName) return res.status(400).json({ error: 'Invalid platform' });

  // Use environment variable for folder
  const downloadsFolder = process.env.DOWNLOAD_NAME;
  if (!downloadsFolder) return res.status(500).json({ error: 'DOWNLOAD_NAME not set' });

  const fileUrl = `/${downloadsFolder}/${fileName}`;

  res.status(200).json({ url: fileUrl });
}
