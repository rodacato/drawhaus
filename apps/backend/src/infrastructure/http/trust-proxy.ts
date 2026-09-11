import type { Express } from "express";

// cloudflared -> kamal-proxy -> app. Trusting exactly these two makes req.ip the client;
// trusting more would let a client forge X-Forwarded-For. See docs/guides/kamal-deploy.md.
const TRUSTED_PROXY_HOPS = 2;

export function configureTrustProxy(app: Express): void {
  app.set("trust proxy", TRUSTED_PROXY_HOPS);
}
