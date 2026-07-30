import { GameType } from "../../../../shared/content";
import { dailyObjectiveGet } from "../../../_lib/daily-objective-api";

export const onRequestGet = dailyObjectiveGet(GameType.MEMORY, "daily_memory_objective_failed");

