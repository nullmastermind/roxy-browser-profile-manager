import { config } from './config.js';

interface WorkspaceRow {
  id: number;
  workspaceName: string;
}

interface WorkspaceResponse {
  code: number;
  data?: { total: number; rows: WorkspaceRow[] };
  msg?: string;
}

interface BrowserRow {
  dirId: string;
  windowName?: string;
}

interface BrowserListResponse {
  code: number;
  data?: { total: number; rows: BrowserRow[] };
  msg?: string;
}

const CACHE_TTL_MS = 30_000;
const PAGE_SIZE = 100;

let cachedMap: Record<string, string> | null = null;
let cachedAt = 0;
let inflight: Promise<Record<string, string>> | null = null;

async function roxyGet<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(path, config.roxyBrowserBaseUrl);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      token: config.roxyBrowserApiKey,
    },
  });
  if (!response.ok) {
    throw new Error(`Roxy API ${path} returned HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

async function roxyPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = new URL(path, config.roxyBrowserBaseUrl);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token: config.roxyBrowserApiKey,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Roxy API ${path} returned HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

function assertApiKey(): void {
  if (!config.roxyBrowserApiKey) {
    throw new Error('ROXY_BROWSER_API_KEY is not configured');
  }
}

async function listWorkspaceIds(): Promise<number[]> {
  const ids: number[] = [];
  let page = 1;
  while (true) {
    const res = await roxyGet<WorkspaceResponse>('/browser/workspace', {
      page_index: page,
      page_size: PAGE_SIZE,
    });
    if (res.code !== 0 || !res.data) {
      throw new Error(`Roxy /browser/workspace failed: ${res.msg ?? 'unknown error'}`);
    }
    for (const row of res.data.rows) {
      ids.push(row.id);
    }
    if (res.data.rows.length < PAGE_SIZE || ids.length >= res.data.total) {
      break;
    }
    page += 1;
  }
  return ids;
}

async function listProfilesInWorkspace(workspaceId: number): Promise<BrowserRow[]> {
  const rows: BrowserRow[] = [];
  let page = 1;
  while (true) {
    const res = await roxyGet<BrowserListResponse>('/browser/list_v3', {
      workspaceId,
      page_index: page,
      page_size: PAGE_SIZE,
    });
    if (res.code !== 0 || !res.data) {
      throw new Error(
        `Roxy /browser/list_v3 (workspace ${workspaceId}) failed: ${res.msg ?? 'unknown error'}`,
      );
    }
    rows.push(...res.data.rows);
    if (res.data.rows.length < PAGE_SIZE || rows.length >= res.data.total) {
      break;
    }
    page += 1;
  }
  return rows;
}

async function buildProfileNameMap(): Promise<Record<string, string>> {
  if (!config.roxyBrowserApiKey) {
    return {};
  }
  const map: Record<string, string> = {};
  const workspaceIds = await listWorkspaceIds();
  for (const workspaceId of workspaceIds) {
    const rows = await listProfilesInWorkspace(workspaceId);
    for (const row of rows) {
      if (row.dirId && row.windowName) {
        map[row.dirId] = row.windowName;
      }
    }
  }
  return map;
}

export async function getProfileNameMap(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedMap && now - cachedAt < CACHE_TTL_MS) {
    return cachedMap;
  }
  if (inflight) {
    return inflight;
  }
  inflight = (async () => {
    try {
      const map = await buildProfileNameMap();
      cachedMap = map;
      cachedAt = Date.now();
      return map;
    } catch (error) {
      console.error('Failed to fetch Roxy profile name map:', error);
      const fallback = cachedMap ?? {};
      return fallback;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

interface CreateProfileResponse {
  code: number;
  msg?: string;
  data?: { dirId: string };
}

interface OpenProfileResponse {
  code: number;
  msg?: string;
  data?: {
    ws?: string;
    http?: string;
    coreVersion?: string;
    driver?: string;
    sortNum?: number;
    windowName?: string;
    windowRemark?: string;
    pid?: number;
  };
}

export async function getFirstWorkspaceId(): Promise<number> {
  assertApiKey();
  const res = await roxyGet<WorkspaceResponse>('/browser/workspace', {
    page_index: 1,
    page_size: 1,
  });
  const firstRow = res.data?.rows[0];
  if (res.code !== 0 || !firstRow) {
    throw new Error(`No Roxy workspace available: ${res.msg ?? 'empty workspace list'}`);
  }
  return firstRow.id;
}

export async function createRoxyProfile(
  workspaceId: number,
  windowName: string,
  proxyInfo?: ProxyInfo,
  fingerInfo?: FingerInfo,
): Promise<string> {
  assertApiKey();
  const body: Record<string, unknown> = { workspaceId, windowName };
  if (proxyInfo) {
    body.proxyInfo = proxyInfo;
  }
  if (fingerInfo) {
    body.fingerInfo = fingerInfo;
  }
  const res = await roxyPost<CreateProfileResponse>('/browser/create', body);
  if (res.code !== 0 || !res.data?.dirId) {
    throw new Error(`Roxy /browser/create failed: ${res.msg ?? 'unknown error'}`);
  }
  return res.data.dirId;
}

export interface ProxyInfo {
  moduleId?: number;
  proxyMethod?: 'custom' | 'choose';
  proxyCategory?: 'noproxy' | 'HTTP' | 'HTTPS' | 'SOCKS5' | 'SSH';
  ipType?: 'IPV4' | 'IPV6';
  host?: string;
  port?: string;
  proxyUserName?: string;
  proxyPassword?: string;
}

export interface FingerInfo {
  randomFingerprint?: boolean;
  [key: string]: unknown;
}

export async function openRoxyProfile(
  workspaceId: number,
  dirId: string,
): Promise<NonNullable<OpenProfileResponse['data']>> {
  assertApiKey();
  const res = await roxyPost<OpenProfileResponse>('/browser/open', {
    workspaceId,
    dirId,
  });
  if (res.code !== 0 || !res.data) {
    throw new Error(`Roxy /browser/open failed: ${res.msg ?? 'unknown error'}`);
  }
  return res.data;
}

interface DeleteProfileResponse {
  code: number;
  msg?: string;
}

export async function deleteRoxyProfile(workspaceId: number, dirIds: string[]): Promise<void> {
  assertApiKey();
  if (dirIds.length === 0) {
    return;
  }
  const res = await roxyPost<DeleteProfileResponse>('/browser/delete', {
    workspaceId,
    dirIds,
    isSoftDelete: false,
  });
  if (res.code !== 0) {
    throw new Error(`Roxy /browser/delete failed: ${res.msg ?? 'unknown error'}`);
  }
}

export interface RoxyProfileSummary {
  dirId: string;
  windowName: string;
  workspaceId: number;
  os?: string;
  coreVersion?: string;
  windowRemark?: string;
}

export async function listAllRoxyProfiles(): Promise<RoxyProfileSummary[]> {
  assertApiKey();
  const workspaceIds = await listWorkspaceIds();
  const out: RoxyProfileSummary[] = [];
  for (const workspaceId of workspaceIds) {
    const rows = await listProfilesInWorkspace(workspaceId);
    for (const row of rows) {
      const r = row as BrowserRow & {
        os?: string;
        coreVersion?: string;
        windowRemark?: string;
      };
      out.push({
        dirId: r.dirId,
        windowName: r.windowName ?? '',
        workspaceId,
        os: r.os,
        coreVersion: r.coreVersion,
        windowRemark: r.windowRemark,
      });
    }
  }
  return out;
}

interface ProfileDetailResponse {
  code: number;
  msg?: string;
  data?: {
    rows?: Array<{
      dirId?: string;
      windowName?: string;
      proxyInfo?: ProxyInfo;
    }>;
  };
}

export async function getRoxyProfileDetail(
  workspaceId: number,
  dirId: string,
): Promise<{ windowName?: string; proxyInfo?: ProxyInfo }> {
  assertApiKey();
  const res = await roxyGet<ProfileDetailResponse>('/browser/detail', {
    workspaceId,
    dirId,
  });
  if (res.code !== 0) {
    throw new Error(`Roxy /browser/detail failed: ${res.msg ?? 'unknown error'}`);
  }
  const row = res.data?.rows?.[0];
  return { windowName: row?.windowName, proxyInfo: row?.proxyInfo };
}

interface ModifyProfileResponse {
  code: number;
  msg?: string;
  data?: { dirId?: string };
}

export async function modifyRoxyProxy(
  workspaceId: number,
  dirId: string,
  proxyInfo: ProxyInfo,
): Promise<void> {
  assertApiKey();
  const res = await roxyPost<ModifyProfileResponse>('/browser/mdf', {
    workspaceId,
    dirId,
    proxyInfo,
  });
  if (res.code !== 0) {
    throw new Error(`Roxy /browser/mdf failed: ${res.msg ?? 'unknown error'}`);
  }
}
