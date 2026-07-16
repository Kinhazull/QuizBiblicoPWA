import { processClosedRoundAwards } from "../../functions/_lib/round-awards";

interface Env {
  DB: D1Database;
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(processClosedRoundAwards(env));
  },

  async fetch(): Promise<Response> {
    return new Response("Journey awards worker is active.", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=UTF-8",
        "cache-control": "no-store",
      },
    });
  },
};
