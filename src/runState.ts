import { promises as fs } from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

export interface RunState {
  dirId: string;
  sourceProfileId: string;
  workspaceId: number;
  updatedAt: string;
}

function getStateFilePath(): string {
  return path.join(config.backupFolderPath, '.run-state.json');
}

export async function readRunState(): Promise<RunState | null> {
  try {
    const raw = await fs.readFile(getStateFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.dirId === 'string' &&
      typeof parsed.sourceProfileId === 'string' &&
      typeof parsed.workspaceId === 'number'
    ) {
      return parsed as RunState;
    }
    return null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.error('Failed to read run state:', error);
    return null;
  }
}

export async function writeRunState(state: RunState): Promise<void> {
  const filePath = getStateFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf8');
}

export async function clearRunState(): Promise<void> {
  try {
    await fs.unlink(getStateFilePath());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Failed to clear run state:', error);
    }
  }
}
