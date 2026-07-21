import type { AppEnv } from "./auth";
import { CORE_PLATFORM_EVENT_CONSUMERS } from "./platform-event-consumers";
import { publishCoreEvent, retryCoreEventDeliveries, type CorePlatformEvent } from "./platform-event-engine";

export function publishOfficialCoreEvent(env: AppEnv, event: CorePlatformEvent, now = Date.now()) {
  return publishCoreEvent(env, event, CORE_PLATFORM_EVENT_CONSUMERS, now);
}

export function retryOfficialCoreEvents(env: AppEnv, options: { now?: number; limit?: number } = {}) {
  return retryCoreEventDeliveries(env, CORE_PLATFORM_EVENT_CONSUMERS, options);
}
