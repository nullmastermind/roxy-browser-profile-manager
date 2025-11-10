#!/usr/bin/env node
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { config } from './config.js';
import {
  assignTagToProfile,
  getAllTags,
  getProfiles,
  removeTagFromProfile,
  updateProfileDescription,
} from './database.js';
import {
  backupProfile,
  deleteBackupProfile,
  getAvailableProfiles,
  restoreProfile,
} from './profileService.js';
import type {
  AssignTagRequest,
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

// Determine the correct public directory path
// When running from compiled executable (Bun.main is the executable path)
// use current working directory, otherwise use relative path from __dirname
const isCompiled = Bun.main.endsWith('.exe') || Bun.main.includes('roxy-browser-profile-manager');
const publicPath = isCompiled
  ? path.join(process.cwd(), 'public')
  : path.join(__dirname, '../public');

console.log('Public path:', publicPath);
console.log('Public path exists:', fs.existsSync(publicPath));

// Check if public folder exists and warn if not
if (!fs.existsSync(publicPath)) {
  console.warn('WARNING: Public folder not found at:', publicPath);
  console.warn('Please ensure the "public" folder is in the same directory as the executable.');
}

app.use(express.static(publicPath));

app.get('/api/profiles', async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page as string, 10) || 1;
    const pageSize = Number.parseInt(req.query.pageSize as string, 10) || 20;
    const tagId = req.query.tagId ? Number.parseInt(req.query.tagId as string, 10) : undefined;
    const search = req.query.search ? (req.query.search as string) : undefined;

    if (page < 1 || pageSize < 1 || pageSize > 10000) {
      return res.status(400).json({ error: 'Invalid pagination parameters' } as ErrorResponse);
    }

    const { profiles, total } = await getProfiles(page, pageSize, tagId, search);
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
    const { sourceProfileId, targetProfileId, description } = req.body as BackupRequest;

    if (!sourceProfileId || typeof sourceProfileId !== 'string') {
      return res.status(400).json({ error: 'Source Profile ID is required' } as ErrorResponse);
    }

    if (targetProfileId !== undefined && typeof targetProfileId !== 'string') {
      return res.status(400).json({ error: 'Target Profile ID must be a string' } as ErrorResponse);
    }

    const resultProfileId = await backupProfile(sourceProfileId, targetProfileId, description);
    res.json({
      success: true,
      message: 'Profile backed up successfully',
      profileId: resultProfileId,
    });
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

app.delete('/api/profiles/:id', async (req, res) => {
  try {
    const profileId = req.params.id;

    if (!profileId || typeof profileId !== 'string') {
      return res.status(400).json({ error: 'Profile ID is required' } as ErrorResponse);
    }

    await deleteBackupProfile(profileId);
    res.json({ success: true, message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete profile';
    res.status(500).json({ error: message } as ErrorResponse);
  }
});

app.get('/api/tags', async (_req, res) => {
  try {
    const tags = await getAllTags();
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' } as ErrorResponse);
  }
});

app.post('/api/profiles/:id/tags', async (req, res) => {
  try {
    const profileId = req.params.id;
    const { tagName } = req.body as AssignTagRequest;

    if (!profileId || typeof profileId !== 'string') {
      return res.status(400).json({ error: 'Profile ID is required' } as ErrorResponse);
    }

    if (!tagName || typeof tagName !== 'string' || tagName.trim() === '') {
      return res.status(400).json({ error: 'Tag name is required' } as ErrorResponse);
    }

    await assignTagToProfile(profileId, tagName.trim());
    res.json({ success: true, message: 'Tag assigned successfully' });
  } catch (error) {
    console.error('Error assigning tag:', error);
    const message = error instanceof Error ? error.message : 'Failed to assign tag';
    res.status(500).json({ error: message } as ErrorResponse);
  }
});

app.delete('/api/profiles/:id/tags/:tagId', async (req, res) => {
  try {
    const profileId = req.params.id;
    const tagId = Number.parseInt(req.params.tagId, 10);

    if (!profileId || typeof profileId !== 'string') {
      return res.status(400).json({ error: 'Profile ID is required' } as ErrorResponse);
    }

    if (Number.isNaN(tagId)) {
      return res.status(400).json({ error: 'Valid tag ID is required' } as ErrorResponse);
    }

    await removeTagFromProfile(profileId, tagId);
    res.json({ success: true, message: 'Tag removed successfully' });
  } catch (error) {
    console.error('Error removing tag:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove tag';
    res.status(500).json({ error: message } as ErrorResponse);
  }
});

// Fallback route for root path if static files are not found
app.get('/', (_req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send(`
      <html>
        <head><title>Error - Public Folder Missing</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Error: Public Folder Not Found</h1>
          <p>The application cannot find the required <code>public</code> folder.</p>
          <h2>To fix this issue:</h2>
          <ol>
            <li>Ensure the <code>public</code> folder exists in the same directory as the executable</li>
            <li>The <code>public</code> folder should contain:
              <ul>
                <li><code>index.html</code></li>
                <li><code>app.js</code></li>
              </ul>
            </li>
          </ol>
          <h3>Current Configuration:</h3>
          <ul>
            <li><strong>Expected public path:</strong> <code>${publicPath}</code></li>
            <li><strong>Public folder exists:</strong> ${fs.existsSync(publicPath) ? 'Yes' : 'No'}</li>
            <li><strong>index.html exists:</strong> ${fs.existsSync(indexPath) ? 'Yes' : 'No'}</li>
            <li><strong>Current working directory:</strong> <code>${process.cwd()}</code></li>
            <li><strong>Executable path:</strong> <code>${Bun.main}</code></li>
          </ul>
        </body>
      </html>
    `);
  }
});

function openBrowser(url: string) {
  const platform = process.platform;
  let command: string;

  switch (platform) {
    case 'win32':
      command = `start ${url}`;
      break;
    case 'darwin':
      command = `open ${url}`;
      break;
    case 'linux':
      command = `xdg-open ${url}`;
      break;
    default:
      console.log(`Please open your browser and navigate to ${url}`);
      return;
  }

  exec(command, (error) => {
    if (error) {
      console.error('Failed to open browser automatically:', error.message);
      console.log(`Please open your browser and navigate to ${url}`);
    }
  });
}

app.listen(config.port, () => {
  const url = `http://localhost:${config.port}`;
  console.log(`Server is running on ${url}`);
  console.log('Opening browser...');
  openBrowser(url);
});
