import { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import fs from 'fs';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { platform } = req.query;

  // Map a friendly platform name to the real file
  const files: Record<string, string> = {
    mac: '1.0-mac.dmg',
    windows: '1.0-win.dmg',
    linux: '1.0-linux.dmg',
  };

  const fileName = files[(platform as string)?.toLowerCase()];
  if (!fileName) return res.status(400).send('Invalid platform');

  const filePath = path.join(__dirname, '../../downloads', fileName);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

  res.setHeader('Content-Disposition', `attachment; filename="CustomLearning-${platform}.dmg"`);
  res.setHeader('Content-Type', 'application/octet-stream');

  fs.createReadStream(filePath).pipe(res);
}
