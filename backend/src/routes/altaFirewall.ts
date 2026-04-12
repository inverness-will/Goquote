import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';

import { fetchFirewallRulesAndResolveIps } from '../services/altaFirewallIps';
import { HttpError } from '../utils/httpError';
import { resolveAltaDeploymentBaseUrl } from '../utils/altaDeploymentUrl';

export const altaFirewallRouter = Router();

const bodySchema = z.object({
  deployment: z.string().min(1, 'deployment is required'),
  region: z.string().optional(),
  username: z.string().min(1, 'username is required'),
  password: z.string().min(1, 'password is required')
});

/**
 * POST /api/alta/firewall-ips
 * Body: { deployment, region?, username, password }
 * Calls Alta Video GET /api/v1/firewallRules, extracts hostnames, resolves A/AAAA.
 *
 * Credentials are used only for the upstream request and are not stored.
 */
altaFirewallRouter.post('/firewall-ips', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(' ');
      throw new HttpError(400, msg);
    }

    const { deployment, region, username, password } = parsed.data;
    const deploymentBaseUrl = resolveAltaDeploymentBaseUrl(deployment, region);
    const result = await fetchFirewallRulesAndResolveIps({
      deploymentBaseUrl,
      username,
      password
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});
