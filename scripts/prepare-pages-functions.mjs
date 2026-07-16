import { rm } from "node:fs/promises";

// Pages Functions use Wrangler's file-based routing. A stale advanced-mode
// worker would make Wrangler ignore the functions/ directory during deploy.
await rm(new URL("../out/_worker.js", import.meta.url), { recursive: true, force: true });
