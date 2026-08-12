import { requireUser, type AppEnv } from "../../../_lib/auth";
import { json } from "../../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env, true);
    const row: any = await env.DB.prepare("SELECT status,enabled_at FROM user_mfa WHERE user_id=?1").bind(user.id).first();
    return json({ status: row?.status || "disabled", enabledAt: row?.enabled_at || null, required: ["owner", "admin"].includes(user.role), canDisable: user.role === "leader" });
  } catch (error) { if (error instanceof Response) return error; throw error; }
};
