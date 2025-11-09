#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { config } from './config.js';
import { getProfiles, updateProfileDescription } from './database.js';
import { backupProfile, getAvailableProfiles, restoreProfile } from './profileService.js';
import type {
  BackupRequest,
  ErrorResponse,
  PaginatedProfilesResponse,
  RestoreRequest,
  UpdateProfileRequest,
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/profiles', async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page as string, 10) || 1;
    const pageSize = Number.parseInt(req.query.pageSize as string, 10) || 20;

    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return res.status(400).json({ error: 'Invalid pagination parameters' } as ErrorResponse);
    }

    const { profiles, total } = await getProfiles(page, pageSize);
    const totalPages = Math.ceil(total / pageSize);

    const response: PaginatedProfilesResponse = {
      profiles,
      total,
      page,
      pageSize,
      totalPages,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' } as ErrorResponse);
  }
});

app.patch('/api/profiles/:id', async (req, res) => {
  try {
    const profileId = req.params.id;
    const { description } = req.body as UpdateProfileRequest;

    if (typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string' } as ErrorResponse);
    }

    const updatedProfile = await updateProfileDescription(profileId, description);
    res.json(updatedProfile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' } as ErrorResponse);
  }
});

app.get('/api/available-profiles', async (_req, res) => {
  try {
    const profiles = await getAvailableProfiles();
    res.json(profiles.map((name) => ({ name })));
  } catch (error) {
    console.error('Error fetching available profiles:', error);
    res.status(500).json({ error: 'Failed to fetch available profiles' } as ErrorResponse);
  }
});

app.post('/api/backup', async (req, res) => {
  try {
    const { profileId, description } = req.body as BackupRequest;

    if (!profileId || typeof profileId !== 'string') {
      return res.status(400).json({ error: 'Profile ID is required' } as ErrorResponse);
    }

    await backupProfile(profileId, description);
    res.json({ success: true, message: 'Profile backed up successfully' });
  } catch (error) {
    console.error('Error backing up profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to backup profile';
    res.status(500).json({ error: message } as ErrorResponse);
  }
});

app.post('/api/restore', async (req, res) => {
  try {
    const { profileId, targetFolderId } = req.body as RestoreRequest;

    if (!profileId || typeof profileId !== 'string') {
      return res.status(400).json({ error: 'Profile ID is required' } as ErrorResponse);
    }

    if (!targetFolderId || typeof targetFolderId !== 'string') {
      return res.status(400).json({ error: 'Target folder ID is required' } as ErrorResponse);
    }

    await restoreProfile(profileId, targetFolderId);
    res.json({ success: true, message: 'Profile restored successfully' });
  } catch (error) {
    console.error('Error restoring profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to restore profile';
    res.status(500).json({ error: message } as ErrorResponse);
  }
});

app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port}`);
});
