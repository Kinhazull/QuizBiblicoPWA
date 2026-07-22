const encoder = new TextEncoder();
const PASSWORD_SCHEME = "pbkdf2-sha256";
// Keep derivation within the Workers Free per-request CPU budget. Credentials
// are migrated only during explicit password creation/change flows.
export const PASSWORD_ITERATIONS = 100_000;

export function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9._-]/g, "");
}

export function randomToken(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return toBase64Url(data);
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toBase64Url(new Uint8Array(digest));
}

async function derivePassword(password:string,salt:string,iterations:number){
  if (password.length > 128) throw new Error("password_too_long");
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations }, key, 256);
  return toBase64Url(new Uint8Array(bits));
}

export async function hashPassword(password: string, salt = randomToken(16)) {
  const derived=await derivePassword(password,salt,PASSWORD_ITERATIONS);
  return { salt, hash: `${PASSWORD_SCHEME}$${PASSWORD_ITERATIONS}$${derived}` };
}

export async function verifyPasswordDetails(password: string, salt: string, expected: string) {
  if (password.length > 128) return false;
  const encoded=expected.match(/^pbkdf2-sha256\$(\d+)\$([A-Za-z0-9_-]+)$/);
  if(encoded){
    const iterations=Number(encoded[1]);
    if(!Number.isSafeInteger(iterations)||iterations<25_000||iterations>1_000_000)return{valid:false,needsUpgrade:false};
    const valid=timingSafeEqual(await derivePassword(password,salt,iterations),encoded[2]);
    return{valid,needsUpgrade:false};
  }
  // Compatibilidade com hashes sem metadados criados nas versões de 100 mil e 25 mil iterações.
  for(const iterations of [100_000,25_000]){
    const valid=timingSafeEqual(await derivePassword(password,salt,iterations),expected);
    if(valid)return{valid:true,needsUpgrade:false};
  }
  return{valid:false,needsUpgrade:false};
}

export async function verifyPassword(password: string, salt: string, expected: string) {
  const result = await verifyPasswordDetails(password, salt, expected);
  return typeof result === "boolean" ? result : result.valid;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function secureEqual(a:string,b:string){const[left,right]=await Promise.all([sha256(a),sha256(b)]);return timingSafeEqual(left,right)}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
}

export function sessionCookie(token: string, persistent: boolean, secure = true) {
  const maxAge = persistent ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  return `quiz_session=${token}; Path=/; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(secure = true) {
  return `quiz_session=; Path=/; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Lax; Max-Age=0`;
}

export function readCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") || "";
  const item = cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}
