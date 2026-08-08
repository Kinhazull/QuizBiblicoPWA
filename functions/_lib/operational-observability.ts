import { json } from "./security";

export const PublicErrorCategory = Object.freeze({
  DOMAIN_ERROR: "DOMAIN_ERROR", VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR", AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND: "NOT_FOUND", CONFLICT: "CONFLICT", RATE_LIMITED: "RATE_LIMITED",
  DEPENDENCY_FAILURE: "DEPENDENCY_FAILURE", INTERNAL_ERROR: "INTERNAL_ERROR",
} as const);
export type PublicErrorCategory = typeof PublicErrorCategory[keyof typeof PublicErrorCategory];

export type OperationalLog = {
  level: "info" | "warn" | "error";
  operation: string;
  component: string;
  supportId?: string;
  publicCode?: string;
  gameType?: string;
  mode?: string;
  eventId?: string;
  durationMs?: number;
  outcome?: "started" | "completed" | "failed" | "degraded";
  retryable?: boolean;
  processed?: number;
  failed?: number;
};

const FORBIDDEN_LOG_FIELDS = new Set(["email", "name", "password", "token", "sessionId", "sql", "payload", "correctAnswer"]);
const SAFE_CODE = /^[a-z][a-z0-9_.:-]{1,99}$/i;

export function createSupportId() {
  return `SUP-${crypto.randomUUID()}`;
}

export function operationalLog(entry: OperationalLog) {
  const record: Record<string, unknown> = { timestamp: new Date().toISOString(), ...entry };
  for (const key of Object.keys(record)) if (FORBIDDEN_LOG_FIELDS.has(key) || record[key] === undefined) delete record[key];
  const line = JSON.stringify(record);
  if (entry.level === "error") console.error(line);
  else if (entry.level === "warn") console.warn(line);
  else console.log(line);
  return record;
}

type PublicErrorOptions = {
  category?: PublicErrorCategory;
  code?: string;
  message?: string;
  status?: number;
  component: string;
  operation: string;
  retryable?: boolean;
  headers?: HeadersInit;
};

const CATEGORY_STATUS: Record<PublicErrorCategory, number> = {
  DOMAIN_ERROR: 400, VALIDATION_ERROR: 400, AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403, NOT_FOUND: 404, CONFLICT: 409, RATE_LIMITED: 429,
  DEPENDENCY_FAILURE: 503, INTERNAL_ERROR: 500,
};

export function publicError(error: unknown, options: PublicErrorOptions) {
  if (error instanceof Response) return error;
  const category = options.category ?? PublicErrorCategory.INTERNAL_ERROR;
  const code = SAFE_CODE.test(options.code ?? "") ? options.code! : category.toLowerCase();
  const status = options.status ?? CATEGORY_STATUS[category];
  const supportId = category === PublicErrorCategory.INTERNAL_ERROR || category === PublicErrorCategory.DEPENDENCY_FAILURE
    ? createSupportId() : undefined;
  operationalLog({
    level: status >= 500 ? "error" : "warn", operation: options.operation, component: options.component,
    supportId, publicCode: code, outcome: "failed", retryable: options.retryable,
  });
  return json({ error: code, category, message: options.message ?? safePublicMessage(category), ...(supportId ? { supportId } : {}) }, status, {
    "cache-control": "no-store, private", ...options.headers,
  });
}

export function publicDomainError(
  error: unknown,
  allowed: Readonly<Record<string, { category?: PublicErrorCategory; status?: number; message?: string }>>,
  context: Pick<PublicErrorOptions, "component" | "operation">,
) {
  if (error instanceof Response) return error;
  const raw = error instanceof Error ? error.message : "";
  const policy = allowed[raw];
  if (!policy) return publicError(error, { ...context, category: PublicErrorCategory.INTERNAL_ERROR, code: `${context.operation}_failed` });
  return publicError(error, { ...context, category: policy.category ?? PublicErrorCategory.DOMAIN_ERROR, code: raw, status: policy.status, message: policy.message });
}

function safePublicMessage(category: PublicErrorCategory) {
  if (category === PublicErrorCategory.AUTHENTICATION_ERROR) return "Autenticação necessária.";
  if (category === PublicErrorCategory.AUTHORIZATION_ERROR) return "Você não possui permissão para esta operação.";
  if (category === PublicErrorCategory.NOT_FOUND) return "O recurso solicitado não foi encontrado.";
  if (category === PublicErrorCategory.VALIDATION_ERROR) return "Revise os dados informados.";
  if (category === PublicErrorCategory.CONFLICT) return "A operação conflita com o estado atual do recurso.";
  if (category === PublicErrorCategory.RATE_LIMITED) return "Muitas tentativas. Aguarde e tente novamente.";
  if (category === PublicErrorCategory.DEPENDENCY_FAILURE) return "Serviço temporariamente indisponível.";
  if (category === PublicErrorCategory.DOMAIN_ERROR) return "Não foi possível concluir esta operação.";
  return "Ocorreu um erro inesperado. Informe o código de suporte.";
}

export type OperationalAlert = { severity: "DEGRADED" | "CRITICAL"; code: string; component: string; supportId?: string };
export interface OperationalAlertSink { send(alert: OperationalAlert): Promise<void> | void }
export const logOnlyOperationalAlertSink: OperationalAlertSink = {
  send(alert) { operationalLog({ level: alert.severity === "CRITICAL" ? "error" : "warn", operation: "operational_alert", component: alert.component, supportId: alert.supportId, publicCode: alert.code, outcome: "degraded" }); },
};
