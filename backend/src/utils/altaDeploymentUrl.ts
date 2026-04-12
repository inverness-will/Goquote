import { HttpError } from './httpError';

/**
 * Build the deployment base URL (no trailing slash).
 * Accepts a full URL, a hostname like `ecosystem-1000.us6.alta.avigilon.com`, or
 * a short deployment name plus `region` (e.g. `ecosystem-1000` + `us6`).
 */
export function resolveAltaDeploymentBaseUrl(deployment: string, region?: string): string {
  const d = deployment.trim();
  if (!d) {
    throw new HttpError(400, 'deployment is required.');
  }

  if (/^https?:\/\//i.test(d)) {
    const u = new URL(d);
    return `${u.protocol}//${u.host}`;
  }

  const hostOnly = d.replace(/\/$/, '');
  if (hostOnly.includes('alta.avigilon.com') || hostOnly.split('.').length >= 3) {
    return `https://${hostOnly}`;
  }

  if (!region?.trim()) {
    throw new HttpError(
      400,
      'region is required when deployment is only the deployment name (e.g. ecosystem-1000 with region us6).'
    );
  }

  return `https://${hostOnly}.${region.trim()}.alta.avigilon.com`;
}
