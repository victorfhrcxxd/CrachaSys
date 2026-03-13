import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const config = { api: { bodyParser: false } };

async function parseFormData(req: NextApiRequest): Promise<{ buffer: Buffer; ext: string }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let ext = 'jpg';
    const contentType = req.headers['content-type'] ?? '';
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return reject(new Error('No boundary'));

    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const boundaryBuf = Buffer.from(`--${boundary}`);
      const start = body.indexOf(boundaryBuf) + boundaryBuf.length + 2;
      const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), start) + 4;
      const headerStr = body.slice(start, headerEnd - 4).toString();
      const filenameMatch = headerStr.match(/filename="(.+?)"/);
      if (filenameMatch) {
        const fname = filenameMatch[1];
        ext = fname.split('.').pop() ?? 'jpg';
      }
      const end = body.lastIndexOf(Buffer.from(`\r\n--${boundary}`));
      resolve({ buffer: body.slice(headerEnd, end), ext });
    });
    req.on('error', reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { buffer, ext } = await parseFormData(req);
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await writeFile(path.join(uploadDir, filename), buffer);
    return res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao processar upload' });
  }
}
