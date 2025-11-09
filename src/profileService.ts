import crypto from 'node:crypto';
import path from 'node:path';
import { config } from './config.js';
import { createProfile, deleteProfile, getProfileById } from './database.js';
import {
  copyDirectory,
  deleteDirectory,
  directoryExists,
  ensureDirectoryExists,
  getDirectoryFolders,
} from './fileUtils.js';

function generateRandomProfileId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function getAvailableProfiles(): Promise<string[]> {
  return await getDirectoryFolders(config.roxyBrowserPath);
}

export async function backupProfile(
  sourceProfileId: string,
  targetProfileId?: string,
  description?: string,
): Promise<string> {
  const sourcePath = path.join(config.roxyBrowserPath, sourceProfileId);

  const sourceExists = await directoryExists(sourcePath);
  if (!sourceExists) {
    throw new Error(`Profile ${sourceProfileId} does not exist in RoxyBrowser cache`);
  }

  const finalTargetProfileId = targetProfileId || generateRandomProfileId();
  const destinationPath = path.join(config.backupFolderPath, finalTargetProfileId);

  const existingProfile = await getProfileById(finalTargetProfileId);

  if (existingProfile && !targetProfileId) {
    throw new Error(`Profile ${finalTargetProfileId} is already backed up`);
  }

  await ensureDirectoryExists(config.backupFolderPath);

  if (existingProfile && targetProfileId) {
    const backupExists = await directoryExists(destinationPath);
    if (backupExists) {
      await deleteDirectory(destinationPath);
    }
  }

  await copyDirectory(sourcePath, destinationPath);

  if (existingProfile) {
    return finalTargetProfileId;
  }

  await createProfile(finalTargetProfileId, description);
  return finalTargetProfileId;
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

export async function deleteBackupProfile(profileId: string): Promise<void> {
  const backupPath = path.join(config.backupFolderPath, profileId);

  const profile = await getProfileById(profileId);
  if (!profile) {
    throw new Error(`Profile ${profileId} not found in database`);
  }

  const backupExists = await directoryExists(backupPath);
  if (backupExists) {
    await deleteDirectory(backupPath);
  }

  await deleteProfile(profileId);
}
