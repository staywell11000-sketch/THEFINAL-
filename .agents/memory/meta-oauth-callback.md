---
name: Meta OAuth callback URL
description: How to form the correct redirect_uri for Meta OAuth in the Replit environment
---

`getApiBaseUrl()` in `connectedAccounts.ts` must return `https://${REPLIT_DEV_DOMAIN}` (no port suffix) so the callback URL passed to Meta is publicly reachable through Replit's proxy.

**Why:** Meta validates redirect_uri strictly. Port-suffixed URLs like `:8080` are not registered as valid redirect URIs in the Meta App dashboard, causing OAuth to fail with "URL blocked" errors.

**How to apply:** Always use `https://${REPLIT_DEV_DOMAIN}` (not `:8080`) as the base for `callbackUrl()`. In production, set `API_URL` env var to the deployed domain.
