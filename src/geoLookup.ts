export interface GeoInfo {
  host: string;
  ip?: string;
  country?: string;
  countryCode?: string;
}

interface CacheEntry {
  info: GeoInfo;
  queriedAt: number;
}

const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

interface IpApiResponse {
  status?: string;
  query?: string;
  country?: string;
  countryCode?: string;
  message?: string;
}

export async function geolocateHosts(hosts: string[]): Promise<Map<string, GeoInfo>> {
  const result = new Map<string, GeoInfo>();
  const now = Date.now();
  const toQuery: string[] = [];

  const unique = Array.from(new Set(hosts.filter((h) => typeof h === 'string' && h !== '')));

  for (const host of unique) {
    const cached = cache.get(host);
    if (cached && now - cached.queriedAt < TTL_MS) {
      result.set(host, cached.info);
    } else {
      toQuery.push(host);
    }
  }

  // ip-api batch limit is 100 per request
  const chunks: string[][] = [];
  for (let i = 0; i < toQuery.length; i += 100) {
    chunks.push(toQuery.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const response = await fetch(
        'http://ip-api.com/batch?fields=status,country,countryCode,query',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk),
        },
      );
      if (!response.ok) {
        for (const host of chunk) {
          const info: GeoInfo = { host };
          cache.set(host, { info, queriedAt: now });
          result.set(host, info);
        }
        continue;
      }
      const rows = (await response.json()) as IpApiResponse[];
      chunk.forEach((host, idx) => {
        const row = rows[idx];
        const info: GeoInfo =
          row && row.status === 'success'
            ? {
                host,
                ip: row.query,
                country: row.country,
                countryCode: row.countryCode,
              }
            : { host };
        cache.set(host, { info, queriedAt: now });
        result.set(host, info);
      });
    } catch (error) {
      console.error('Geo lookup failed:', error);
      for (const host of chunk) {
        const info: GeoInfo = { host };
        cache.set(host, { info, queriedAt: now });
        result.set(host, info);
      }
    }
  }

  return result;
}
