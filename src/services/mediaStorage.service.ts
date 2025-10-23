import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { cfg } from '../core/config';
import { log } from '../core/logger';

const storageLog = log.withContext({ scope: 'mediaStorage' });

const ensureDirectory = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/avif': '.avif'
};

const inferExtension = (filename: string | undefined, mimetype: string | undefined) => {
  const ext = filename ? path.extname(filename).toLowerCase() : '';
  if (ext) return ext;
  if (mimetype) {
    const mapped = MIME_EXTENSION_MAP[mimetype.toLowerCase()];
    if (mapped) return mapped;
  }
  return '.bin';
};

const buildRelativePath = (ext: string) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return path.posix.join(String(year), month, `${randomUUID()}${ext}`);
};

const toPublicUrl = (relativePath: string) => {
  const sanitized = relativePath.replace(/\\/g, '/');
  if (cfg.media.baseUrl) {
    return `${cfg.media.baseUrl}/${sanitized}`;
  }
  return `${cfg.media.publicPath}${sanitized}`;
};

export const mediaStorage = {
  async save(buffer: Buffer, filename?: string, mimetype?: string) {
    const ext = inferExtension(filename, mimetype);
    const relativePath = buildRelativePath(ext);
    const absolutePath = path.join(cfg.media.storageRoot, relativePath);
    await ensureDirectory(path.dirname(absolutePath));
    await fs.writeFile(absolutePath, buffer);
    storageLog.info('Stored media file', { relativePath });
    return {
      relativePath,
      absolutePath,
      url: toPublicUrl(relativePath)
    };
  }
};

// Ensure root directory exists eagerly
void ensureDirectory(cfg.media.storageRoot).catch((error) => {
  storageLog.error('Failed to initialize media storage directory', error);
});
