import 'dotenv/config';

export const config = {
  roxyBrowserPath: process.env.ROXY_BROWSER_PATH || '',
  backupFolderPath: process.env.BACKUP_FOLDER_PATH || './backup-profiles',
  port: Number.parseInt(process.env.PORT || '12346', 10),
  roxyBrowserApiKey: process.env.ROXY_BROWSER_API_KEY || '',
  roxyBrowserBaseUrl: process.env.ROXY_BROWSER_BASE_URL || 'http://localhost:50000',
};

if (!config.roxyBrowserPath) {
  throw new Error('ROXY_BROWSER_PATH environment variable is required');
}
