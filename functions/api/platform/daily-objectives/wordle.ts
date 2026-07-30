import { GameType } from "../../../../shared/content";
import { dailyObjectiveGet } from "../../../_lib/daily-objective-api";

export const onRequestGet = dailyObjectiveGet(GameType.WORDLE, "daily_wordle_objective_failed");
