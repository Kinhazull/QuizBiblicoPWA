import { currentUser, type AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  const user = await currentUser(request, env);
  return user ? json({ authenticated: true, user }) : json({ authenticated: false }, 401);
};
