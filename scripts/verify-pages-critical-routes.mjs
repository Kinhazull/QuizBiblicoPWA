const APP_MARKER = '<meta name="application-name" content="Conte os Feitos"';
const NEXT_PAYLOAD_MARKER = "self.__next_f.push";

export const CRITICAL_PAGES_ROUTES = Object.freeze([
  { path: "/", segment: "" },
  { path: "/configurar-mfa/", segment: "configurar-mfa" },
  { path: "/recuperar-conta/", segment: "recuperar-conta" },
  { path: "/admin/", segment: "admin" },
]);

function routeTreeMarker(segment) {
  if (!segment) return `\\"c\\":[\\"\\",\\"\\"]`;
  return `\\"c\\":[\\"\\",\\"${segment}\\",\\"\\"]`;
}

export function validateCriticalPageResponse({ path, segment, status, contentType, body }) {
  if (status !== 200) throw new Error(`pages_route_smoke_http:${path}:${status}`);
  if (!contentType.toLowerCase().startsWith("text/html")) {
    throw new Error(`pages_route_smoke_content_type:${path}`);
  }
  if (!body.trim()) throw new Error(`pages_route_smoke_empty:${path}`);
  if (!body.includes(APP_MARKER) || !body.includes(NEXT_PAYLOAD_MARKER)) {
    throw new Error(`pages_route_smoke_app_marker:${path}`);
  }
  if (!body.includes(routeTreeMarker(segment))) {
    throw new Error(`pages_route_smoke_route_marker:${path}`);
  }
}

export async function verifyCriticalPagesRoutes(
  baseUrl,
  fetchImpl = fetch,
  { attempts = 1, delayMs = 0 } = {},
) {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  for (const route of CRITICAL_PAGES_ROUTES) {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const response = await fetchImpl(`${normalizedBase}${route.path}`, { redirect: "follow" });
        const body = await response.text();
        validateCriticalPageResponse({
          ...route,
          status: response.status,
          contentType: response.headers.get("content-type") ?? "",
          body,
        });
        break;
      } catch (error) {
        if (attempt >= attempts) throw error;
        console.warn(`Critical Pages route not ready: ${route.path} (attempt ${attempt}/${attempts})`);
        await new Promise(resolveDelay => setTimeout(resolveDelay, delayMs));
      }
    }
    console.log(`Critical Pages route verified: ${route.path}`);
  }
}

function cliBaseUrl(argv) {
  const positional = argv.filter((argument) => argument !== "--");
  if (positional.length !== 1) throw new Error("usage: verify-pages-critical-routes <base-url>");
  const url = new URL(positional[0]);
  if (!/^https?:$/.test(url.protocol)) throw new Error("pages_route_smoke_invalid_url");
  return url.toString();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await verifyCriticalPagesRoutes(cliBaseUrl(process.argv.slice(2)), fetch, { attempts: 12, delayMs: 5_000 });
}
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
