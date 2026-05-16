import { promises as fs } from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import type { ProxyInfo } from './roxyApi.js';

export interface BackupMeta {
  proxyInfo?: ProxyInfo;
  windowName?: string;
  sourceProfileId?: string;
  capturedAt: string;
}

function getMetaDir(): string {
  return path.join(config.backupFolderPath, '.meta');
}

function getMetaPath(profileId: string): string {
  return path.join(getMetaDir(), `${profileId}.json`);
}

export async function readBackupMeta(profileId: string): Promise<BackupMeta | null> {
  try {
    const raw = await fs.readFile(getMetaPath(profileId), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as BackupMeta;
    }
    return null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.error(`Failed to read backup meta for ${profileId}:`, error);
    return null;
  }
}

export async function writeBackupMeta(profileId: string, meta: BackupMeta): Promise<void> {
  const filePath = getMetaPath(profileId);
  await fs.mkdir(getMetaDir(), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(meta, null, 2), 'utf8');
}

export async function deleteBackupMeta(profileId: string): Promise<void> {
  try {
    await fs.unlink(getMetaPath(profileId));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Failed to delete backup meta for ${profileId}:`, error);
    }
  }
}

export async function listAllBackupMetas(): Promise<
  Array<{ profileId: string; meta: BackupMeta }>
> {
  const dir = getMetaDir();
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  const results: Array<{ profileId: string; meta: BackupMeta }> = [];
  for (const file of entries) {
    if (!file.endsWith('.json')) continue;
    const profileId = file.replace(/\.json$/, '');
    const meta = await readBackupMeta(profileId);
    if (meta) {
      results.push({ profileId, meta });
    }
  }
  return results;
}
