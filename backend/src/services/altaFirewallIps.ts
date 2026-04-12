import dns from 'node:dns/promises';

import { HttpError } from '../utils/httpError';

/** Rough hostname / wildcard pattern from firewallRules JSON */
const DOMAIN_LIKE =
  /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

function collectDomainLikeStrings(value: unknown, out: Set<string>): void {
  if (typeof value === 'string') {
    const s = value.trim();
    if (s.length > 0 && s.length < 512 && DOMAIN_LIKE.test(s) && !s.includes('://')) {
      out.add(s);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectDomainLikeStrings(item, out);
    }
  } else if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value)) {
      collectDomainLikeStrings(v, out);
    }
  }
}

function basicAuthHeader(username: string, password: string): string {
  const token = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

export interface AltaFirewallIpRow {
  domain: string;
  ipv4: string[];
  ipv6: string[];
  skipped?: string;
}

export interface AltaFirewallIpsResult {
  deploymentBaseUrl: string;
  domains: AltaFirewallIpRow[];
}

export async function fetchFirewallRulesAndResolveIps(options: {
  deploymentBaseUrl: string;
  username: string;
  password: string;
}): Promise<AltaFirewallIpsResult> {
  const { deploymentBaseUrl, username, password } = options;
  const url = `${deploymentBaseUrl}/api/v1/firewallRules`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: basicAuthHeader(username, password),
        Accept: 'application/json'
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new HttpError(502, `Failed to reach Alta Video deployment: ${message}`);
  }

  const text = await res.text();
  if (!res.ok) {
    const snippet = text.length > 300 ? `${text.slice(0, 300)}…` : text;
    throw new HttpError(
      res.status === 401 || res.status === 403 ? res.status : 502,
      `Alta Video firewallRules request failed (${res.status}). ${snippet}`
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(502, 'Alta Video returned non-JSON from firewallRules.');
  }

  const domainSet = new Set<string>();
  collectDomainLikeStrings(json, domainSet);
  const domains = [...domainSet].sort((a, b) => a.localeCompare(b));

  const rows: AltaFirewallIpRow[] = [];

  for (const domain of domains) {
    if (domain.startsWith('*.')) {
      rows.push({
        domain,
        ipv4: [],
        ipv6: [],
        skipped: 'Wildcard hostnames cannot be resolved to fixed IPs; use DNS names in the firewall or expand to concrete hostnames.'
      });
      continue;
    }

    const ipv4: string[] = [];
    const ipv6: string[] = [];
    try {
      const a = await dns.resolve4(domain);
      ipv4.push(...[...new Set(a)].sort());
    } catch {
      /* no A records */
    }
    try {
      const aaaa = await dns.resolve6(domain);
      ipv6.push(...[...new Set(aaaa)].sort());
    } catch {
      /* no AAAA records */
    }

    if (ipv4.length === 0 && ipv6.length === 0) {
      rows.push({
        domain,
        ipv4: [],
        ipv6: [],
        skipped: 'No DNS A/AAAA records returned (may be dynamic or internal-only).'
      });
    } else {
      rows.push({ domain, ipv4, ipv6 });
    }
  }

  return {
    deploymentBaseUrl,
    domains: rows
  };
}
