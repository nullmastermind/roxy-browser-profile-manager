#!/usr/bin/env node
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import {
  deleteBackupMeta,
  listAllBackupMetas,
  readBackupMeta,
  writeBackupMeta,
} from './backupMeta.js';
import { config } from './config.js';
import {
  assignTagToProfile,
  getAllTags,
  getProfileById,
  getProfiles,
  removeTagFromProfile,
  updateProfileBackupSize,
  updateProfileDescription,
} from './database.js';
import { deleteDirectory, getDirectorySize } from './fileUtils.js';
import { geolocateHosts } from './geoLookup.js';
import {
  backupProfile,
  calculateTotalBackupSize,
  deleteBackupProfile,
  getAvailableProfiles,
  restoreProfile,
} from './profileService.js';
import type { ProxyInfo } from './roxyApi.js';
import {
  createRoxyProfile,
  deleteRoxyProfile,
  getFirstWorkspaceId,
  getProfileNameMap,
  getRoxyProfileDetail,
  listAllRoxyProfiles,
  modifyRoxyProxy,
  openRoxyProfile,
} from './roxyApi.js';
import { clearRunState, readRunState, writeRunState } from './runState.js';
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

// Custom JSON serializer to handle BigInt
app.set('json replacer', (_key: string, value: unknown) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
});

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

    // Parse multiple tag IDs and filter mode
    let tagIds: number[] | undefined;
    if (req.query.tagIds) {
      const tagIdsParam = req.query.tagIds as string;
      tagIds = tagIdsParam
        .split(',')
        .map((id) => Number.parseInt(id.trim(), 10))
        .filter((id) => !Number.isNaN(id));
      if (tagIds.length === 0) {
        tagIds = undefined;
      }
    }

    const tagFilterMode =
      req.query.tagFilterMode === 'AND' || req.query.tagFilterMode === 'OR'
        ? (req.query.tagFilterMode as 'AND' | 'OR')
        : 'OR';

    if (page < 1 || pageSize < 1 || pageSize > 10000) {
      return res.status(400).json({ error: 'Invalid pagination parameters' } as ErrorResponse);
    }

    const { profiles, total } = await getProfiles(
      page,
      pageSize,
      tagId,
      search,
      tagIds,
      tagFilterMode,
    );
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

app.post('/api/profiles/:id/recalculate-size', async (req, res) => {
  try {
    const profileId = req.params.id;

    if (!profileId || typeof profileId !== 'string') {
      return res.status(400).json({ error: 'Profile ID is required' } as ErrorResponse);
    }

    const profile = await getProfileById(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' } as ErrorResponse);
    }

    const backupPath = path.join(config.backupFolderPath, profileId);
    const backupSize = await getDirectorySize(backupPath);
    const backupSizeInBytes = BigInt(backupSize);

    await updateProfileBackupSize(profileId, backupSizeInBytes);

    res.json({ backupSizeInBytes: backupSizeInBytes.toString() });
  } catch (error) {
    console.error('Error recalculating profile size:', error);
    const message = error instanceof Error ? error.message : 'Failed to recalculate profile size';
    res.status(500).json({ error: message } as ErrorResponse);
  }
});

app.get('/api/profiles/:id/proxy', async (req, res) => {
  try {
    const profileId = req.params.id;
    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID is required' } as ErrorResponse);
    }
    const meta = await readBackupMeta(profileId);
    res.json({
      proxyInfo: meta?.proxyInfo ?? null,
      capturedAt: meta?.capturedAt ?? null,
    });
  } catch (error) {
    console.error('Error reading profile proxy:', error);
    const message = error instanceof Error ? error.message : 'Failed to read profile proxy';
    res.status(500).json({ error: message } as ErrorResponse);
  }
});

app.put('/api/profiles/:id/proxy', async (req, res) => {
  try {
    const profileId = req.params.id;
    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID is required' } as ErrorResponse);
    }
    const profile = await getProfileById(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' } as ErrorResponse);
    }
    const { proxyInfo } = (req.body ?? {}) as { proxyInfo?: ProxyInfo | null };
    const existing = (await readBackupMeta(profileId)) ?? {
      capturedAt: new Date().toISOString(),
    };
    const normalized: ProxyInfo =
      proxyInfo?.host && proxyInfo.port
        ? {
            moduleId: 0,
            proxyMethod: 'custom',
            ipType: 'IPV4',
            ...proxyInfo,
          }
        : {
            moduleId: 0,
            proxyMethod: 'custom',
            proxyCategory: 'noproxy',
          };
    await writeBackupMeta(profileId, {
      ...existing,
      proxyInfo: normalized,
      capturedAt: new Date().toISOString(),
    });
    res.json({ proxyInfo: normalized });
  } catch (error) {
    console.error('Error updating profile proxy:', error);
    const message = error instanceof Error ? error.message : 'Failed to update profile proxy';
    res.status(500).json({ error: message } as ErrorResponse);
  }
});

app.get('/api/profiles-proxy-info', async (_req, res) => {
  try {
    const metas = await listAllBackupMetas();
    const hosts = metas
      .map((m) => m.meta.proxyInfo?.host)
      .filter((h): h is string => typeof h === 'string' && h !== '');
    const geo = await geolocateHosts(hosts);
    const out: Record<string, unknown> = {};
    for (const { profileId, meta } of metas) {
      const info = meta.proxyInfo;
      if (!info || !info.host || !info.port || info.proxyCategory === 'noproxy') {
        out[profileId] = null;
        continue;
      }
      const g = geo.get(info.host);
      out[profileId] = {
        host: info.host,
        port: info.port,
        protocol: info.proxyCategory ?? null,
        ip: g?.ip ?? null,
        country: g?.country ?? null,
        countryCode: g?.countryCode ?? null,
      };
    }
    res.json(out);
  } catch (error) {
    console.error('Error fetching proxy info:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch proxy info';
    res.status(500).json({ error: message } as ErrorResponse);
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

app.post('/api/available-profiles/delete', async (req, res) => {
  try {
    const { name } = (req.body ?? {}) as { name?: string };
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' } as ErrorResponse);
    }
    if (name.includes('/') || name.includes('\\') || name.includes('..') || name === '') {
      return res.status(400).json({ error: 'Invalid folder name' } as ErrorResponse);
    }
    const root = path.resolve(config.roxyBrowserPath);
    const target = path.resolve(path.join(root, name));
    if (!target.startsWith(root + path.sep)) {
      return res.status(400).json({ error: 'Invalid folder path' } as ErrorResponse);
    }
    if (!fs.existsSync(target)) {
      return res.status(404).json({ error: 'Folder not found' } as ErrorResponse);
    }
    await deleteDirectory(target);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting available profile folder:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete folder';
    res.status(500).json({ error: message } as ErrorResponse);
  }
});

app.get('/api/roxy-profile-names', async (_req, res) => {
  try {
    const map = await getProfileNameMap();
    res.json(map);
  } catch (error) {
    console.error('Error fetching Roxy profile names:', error);
    res.status(500).json({ error: 'Failed to fetch Roxy profile names' } as ErrorResponse);
  }
});

app.post('/api/roxy/create-profile', async (req, res) => {
  try {
    const { windowName, sourceProfileId, proxyInfo } = (req.body ?? {}) as {
      windowName?: string;
      sourceProfileId?: string;
      proxyInfo?: ProxyInfo;
    };
    const hasSource = typeof sourceProfileId === 'string' && sourceProfileId !== '';
    const name =
      typeof windowName === 'string' && windowName.trim() !== ''
        ? windowName.trim()
        : 'Run profile';

    const existing = await readRunState();

    if (hasSource && existing && existing.sourceProfileId === sourceProfileId) {
      return res.json({
        dirId: existing.dirId,
        workspaceId: existing.workspaceId,
        windowName: name,
        reused: true,
        replacedPrevious: false,
      });
    }

    let replacedPrevious = false;
    if (existing) {
      try {
        await deleteRoxyProfile(existing.workspaceId, [existing.dirId]);
      } catch (error) {
        console.error('Failed to delete previous Roxy profile (continuing):', error);
      }
      await clearRunState();
      replacedPrevious = true;
    }

    const workspaceId = await getFirstWorkspaceId();
    const dirId = await createRoxyProfile(workspaceId, name, proxyInfo, {
      randomFingerprint: true,
    });
    await writeRunState({
      dirId,
      sourceProfileId: hasSource ? (sourceProfileId as string) : '__adhoc__',
      workspaceId,
      updatedAt: new Date().toISOString(),
    });
    res.json({ dirId, workspaceId, windowName: name, reused: false, replacedPrevious });
  } catch (error) {
    console.error('Error creating Roxy profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to create Roxy profile';
    res.status(500).json({ error: message } as ErrorResponse);
  }
});

app.post('/api/roxy/open-profile', async (req, res) => {
  try {
    const { dirId, workspaceId } = (req.body ?? {}) as { dirId?: string; workspaceId?: number };
    if (!dirId || typeof dirId !== 'string') {
      return res.status(400).json({ error: 'dirId is required' } as ErrorResponse);
    }
    const wsId = typeof workspaceId === 'number' ? workspaceId : await getFirstWorkspaceId();
    const data = await openRoxyProfile(wsId, dirId);
    res.json(data);
  } catch (error) {
    console.error('Error opening Roxy profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to open Roxy profile';
    res.status(500).json({ error: message } as ErrorResponse);
  }
});

app.get('/api/roxy/profiles', async (_req, res) => {
  try {
    const profiles = await listAllRoxyProfiles();
    res.json(profiles);
  } catch (error) {
    console.error('Error listing Roxy profiles:', error);
    const message = error instanceof Error ? error.message : 'Failed to list Roxy profiles';
    res.status(500).json({ error: message } as ErrorResponse);
  }
});

app.get('/api/roxy/profile-detail', async (req, res) => {
  try {
    const dirId = req.query.dirId as string | undefined;
    const workspaceIdParam = req.query.workspaceId as string | undefined;
    if (!dirId || !workspaceIdParam) {
      return res.status(400).json({ error: 'workspaceId and dirId are required' } as ErrorResponse);
    }
    const workspaceId = Number.parseInt(workspaceIdParam, 10);
    if (Number.isNaN(workspaceId)) {
      return res.status(400).json({ error: 'workspaceId must be a number' } as ErrorResponse);
    }
    const detail = await getRoxyProfileDetail(workspaceId, dirId);
    res.json(detail);
  } catch (error) {
    console.error('Error fetching Roxy profile detail:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch profile detail';
    res.status(500).json({ error: message } as ErrorResponse);
  }
});

app.post('/api/roxy/update-proxy', async (req, res) => {
  try {
    const { workspaceId, dirId, proxyInfo } = (req.body ?? {}) as {
      workspaceId?: number;
      dirId?: string;
      proxyInfo?: ProxyInfo;
    };
    if (!dirId || typeof workspaceId !== 'number' || !proxyInfo) {
      return res
        .status(400)
        .json({ error: 'workspaceId, dirId, and proxyInfo are required' } as ErrorResponse);
    }
    await modifyRoxyProxy(workspaceId, dirId, proxyInfo);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating Roxy proxy:', error);
    const message = error instanceof Error ? error.message : 'Failed to update proxy';
    res.status(500).json({ error: message } as ErrorResponse);
  }
});

app.post('/api/roxy/delete-profile', async (req, res) => {
  try {
    const { workspaceId, dirId } = (req.body ?? {}) as {
      workspaceId?: number;
      dirId?: string;
    };
    if (!dirId) {
      return res.status(400).json({ error: 'dirId is required' } as ErrorResponse);
    }
    let wsId = typeof workspaceId === 'number' ? workspaceId : undefined;
    if (wsId === undefined) {
      const all = await listAllRoxyProfiles();
      const found = all.find((p) => p.dirId === dirId);
      if (!found) {
        return res
          .status(404)
          .json({ error: 'Profile not found in any workspace' } as ErrorResponse);
      }
      wsId = found.workspaceId;
    }
    await deleteRoxyProfile(wsId, [dirId]);
    const state = await readRunState();
    if (state && state.dirId === dirId) {
      await clearRunState();
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting Roxy profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete profile';
    res.status(500).json({ error: message } as ErrorResponse);
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

    try {
      if (config.roxyBrowserApiKey) {
        const all = await listAllRoxyProfiles();
        const found = all.find((p) => p.dirId === sourceProfileId);
        if (found) {
          const detail = await getRoxyProfileDetail(found.workspaceId, sourceProfileId);
          await writeBackupMeta(resultProfileId, {
            proxyInfo: detail.proxyInfo,
            windowName: detail.windowName ?? found.windowName,
            sourceProfileId,
            capturedAt: new Date().toISOString(),
          });
        }
      }
    } catch (metaError) {
      console.error('Failed to capture proxy metadata (continuing):', metaError);
    }

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

    let proxyApplied = false;
    try {
      const meta = await readBackupMeta(profileId);
      if (meta?.proxyInfo && config.roxyBrowserApiKey) {
        const all = await listAllRoxyProfiles();
        const target = all.find((p) => p.dirId === targetFolderId);
        if (target) {
          await modifyRoxyProxy(target.workspaceId, targetFolderId, meta.proxyInfo);
          proxyApplied = true;
        }
      }
    } catch (proxyError) {
      console.error('Failed to apply proxy from backup (continuing):', proxyError);
    }

    res.json({ success: true, message: 'Profile restored successfully', proxyApplied });
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
    await deleteBackupMeta(profileId);
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

app.get('/api/backup-size', async (_req, res) => {
  try {
    const totalSizeBytes = await calculateTotalBackupSize();
    res.json({ totalSizeBytes });
  } catch (error) {
    console.error('Error calculating backup size:', error);
    res.status(500).json({ error: 'Failed to calculate backup size' } as ErrorResponse);
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
