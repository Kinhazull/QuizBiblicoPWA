import type { AppEnv } from "../../_lib/auth";
import { clearSessionCookie, json, readCookie, sha256 } from "../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  const token = readCookie(request, "quiz_session");
  if (token) await env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?1`).bind(await sha256(token)).run();
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie(String(env.LOCAL_LAN_DEVELOPMENT) !== "true") });
};
