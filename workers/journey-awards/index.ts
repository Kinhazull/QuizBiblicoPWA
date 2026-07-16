import { processClosedRoundAwards } from "../../functions/_lib/round-awards";

const journeyAwardsWorker = {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(processClosedRoundAwards(env).then(result=>{
      console.log(JSON.stringify({message:"journey_awards_completed",...result,executedAt:Date.now()}));
    }).catch(error=>{
      console.error(JSON.stringify({message:"journey_awards_failed",error:error instanceof Error?error.message:String(error),executedAt:Date.now()}));
      throw error;
    }));
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

export default journeyAwardsWorker;
