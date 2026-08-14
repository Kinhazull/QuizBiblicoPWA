import assert from "node:assert/strict";
import test from "node:test";
import {
  CRITICAL_PAGES_ROUTES,
  validateCriticalPageResponse,
  verifyCriticalPagesRoutes,
} from "../scripts/verify-pages-critical-routes.mjs";

const routeTree = (segment) => segment ? `\\"c\\":[\\"\\",\\"${segment}\\",\\"\\"]` : `\\"c\\":[\\"\\",\\"\\"]`;
const appHtml = (segment) => `<!doctype html><html><head><meta name="application-name" content="Conte os Feitos"/></head><body><div id="app"></div><script>self.__next_f.push([1,"0:{\\"P\\":null,${routeTree(segment)}}"])</script></body></html>`;

function response(body, { status = 200, contentType = "text/html; charset=utf-8" } = {}) {
  return new Response(body, { status, headers: { "content-type": contentType } });
}

test("critical Pages smoke accepts real structural markers without client-only copy", async () => {
  const requested = [];
  await verifyCriticalPagesRoutes("https://deployment.example", async (url) => {
    requested.push(new URL(url).pathname);
    const route = CRITICAL_PAGES_ROUTES.find(({ path }) => path === new URL(url).pathname);
    return response(appHtml(route.segment));
  });
  assert.deepEqual(requested, CRITICAL_PAGES_ROUTES.map(({ path }) => path));
  assert.doesNotMatch(appHtml("configurar-mfa"), /CONFIGURAR AUTENTICADOR/);
});

test("critical Pages smoke rejects HTTP 404", () => {
  assert.throws(() => validateCriticalPageResponse({ path: "/configurar-mfa/", segment: "configurar-mfa", status: 404, contentType: "text/html", body: appHtml("configurar-mfa") }), /pages_route_smoke_http/);
});

test("critical Pages smoke rejects fallback HTML from another route", () => {
  assert.throws(() => validateCriticalPageResponse({ path: "/configurar-mfa/", segment: "configurar-mfa", status: 200, contentType: "text/html", body: appHtml("") }), /pages_route_smoke_route_marker/);
});

test("critical Pages smoke rejects empty response", () => {
  assert.throws(() => validateCriticalPageResponse({ path: "/configurar-mfa/", segment: "configurar-mfa", status: 200, contentType: "text/html", body: "" }), /pages_route_smoke_empty/);
});

test("critical Pages smoke rejects response without application marker", () => {
  const body = appHtml("configurar-mfa").replace('<meta name="application-name" content="Conte os Feitos"/>', "");
  assert.throws(() => validateCriticalPageResponse({ path: "/configurar-mfa/", segment: "configurar-mfa", status: 200, contentType: "text/html", body }), /pages_route_smoke_app_marker/);
});

test("critical Pages smoke rejects non-HTML responses", () => {
  assert.throws(() => validateCriticalPageResponse({ path: "/configurar-mfa/", segment: "configurar-mfa", status: 200, contentType: "application/json", body: appHtml("configurar-mfa") }), /pages_route_smoke_content_type/);
});
