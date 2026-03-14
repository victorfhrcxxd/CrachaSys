import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
const Busboy: any = require('busboy');
/* eslint-enable */

// 20MB limit — suporta PDFs grandes
export const config = { api: { bodyParser: false, sizeLimit: '20mb' } };

function parseFormData(req: NextApiRequest): Promise<{ buffer: Buffer; filename: string; ext: string }> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] ?? '';
    let fileSize = 0;
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB

    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: MAX_SIZE },
    });

    let resolved = false;

    busboy.on('file', (_field: string, stream: NodeJS.ReadableStream & { resume(): void }, info: { filename: string; mimeType: string }) => {
      const { filename, mimeType } = info;
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
      
      // Valida tipo de arquivo
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowed.includes(mimeType)) {
        stream.resume(); // descarta o stream
        return reject(new Error(`Tipo de arquivo não suportado: ${mimeType}. Use JPEG, PNG ou PDF.`));
      }

      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => {
        fileSize += chunk.length;
        chunks.push(chunk);
      });
      stream.on('limit', () => {
        reject(new Error(`Arquivo muito grande. Limite: 20MB`));
      });
      stream.on('end', () => {
        if (!resolved) {
          resolved = true;
          resolve({ buffer: Buffer.concat(chunks), filename, ext });
        }
      });
      stream.on('error', reject);
    });

    busboy.on('error', reject);
    busboy.on('finish', () => {
      if (!resolved) reject(new Error('Nenhum arquivo encontrado no upload'));
    });

    req.pipe(busboy);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { buffer, ext, filename: origFilename } = await parseFormData(req);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const endpoint = process.env.STORAGE_ENDPOINT;
    const accessKey = process.env.STORAGE_ACCESS_KEY;
    const secretKey = process.env.STORAGE_SECRET_KEY;
    const bucket = process.env.STORAGE_BUCKET;
    const region = process.env.STORAGE_REGION ?? 'us-east-1';
    const publicUrl = process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL;

    // Só usa S3 se o endpoint existir E não for localhost (MinIO local pode não estar rodando)
    const isLocalEndpoint = !endpoint || endpoint.includes('localhost') || endpoint.includes('127.0.0.1');
    const useS3 = !!(accessKey && secretKey && bucket && publicUrl && !isLocalEndpoint);

    if (useS3) {
      // ─── Upload via S3 (AWS / MinIO / Supabase Storage) ─────────────────
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

      const isAws = endpoint?.includes('amazonaws.com');
      const client = new S3Client({
        region,
        endpoint: isAws ? undefined : endpoint,
        forcePathStyle: !isAws, // necessário para MinIO e Supabase Storage
        credentials: { accessKeyId: accessKey!, secretAccessKey: secretKey! },
      });

      const contentType = ext === 'pdf'
        ? 'application/pdf'
        : ext === 'png'
        ? 'image/png'
        : 'image/jpeg';

      const key = `uploads/${uniqueName}`;
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      }));

      const fileUrl = `${publicUrl!.replace(/\/$/, '')}/${key}`;
      console.log('[upload] S3 ok:', fileUrl, '(original:', origFilename, ')');
      return res.json({ url: fileUrl });

    } else {
      // ─── Fallback: filesystem local (apenas dev sem S3) ──────────────────
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, uniqueName), buffer);
      console.log('[upload] local ok:', uniqueName);
      return res.json({ url: `/uploads/${uniqueName}` });
    }
  } catch (err) {
    console.error('[upload] erro:', err);
    const msg = err instanceof Error ? err.message : 'Erro ao processar upload';
    return res.status(500).json({ error: msg });
  }
}
