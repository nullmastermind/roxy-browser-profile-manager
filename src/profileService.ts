import path from 'node:path';
import { config } from './config.js';
import { createProfile, getProfileById } from './database.js';
import {
  copyDirectory,
  deleteDirectory,
  directoryExists,
  ensureDirectoryExists,
  getDirectoryFolders,
} from './fileUtils.js';

export async function getAvailableProfiles(): Promise<string[]> {
  return await getDirectoryFolders(config.roxyBrowserPath);
}

export async function backupProfile(profileId: string, description?: string): Promise<void> {
  const sourcePath = path.join(config.roxyBrowserPath, profileId);
  const destinationPath = path.join(config.backupFolderPath, profileId);

  const sourceExists = await directoryExists(sourcePath);
  if (!sourceExists) {
    throw new Error(`Profile ${profileId} does not exist in RoxyBrowser cache`);
  }

  const existingProfile = await getProfileById(profileId);
  if (existingProfile) {
    throw new Error(`Profile ${profileId} is already backed up`);
  }

  await ensureDirectoryExists(config.backupFolderPath);
  await copyDirectory(sourcePath, destinationPath);
  await createProfile(profileId, description);
}

export async function restoreProfile(profileId: string, targetFolderId: string): Promise<void> {
  const backupPath = path.join(config.backupFolderPath, profileId);
  const targetPath = path.join(config.roxyBrowserPath, targetFolderId);

  const backupExists = await directoryExists(backupPath);
  if (!backupExists) {
    throw new Error(`Backup for profile ${profileId} does not exist`);
  }

  const profile = await getProfileById(profileId);
  if (!profile) {
    throw new Error(`Profile ${profileId} not found in database`);
  }

  const targetExists = await directoryExists(targetPath);
  if (targetExists) {
    await deleteDirectory(targetPath);
  }

  await copyDirectory(backupPath, targetPath);
}
