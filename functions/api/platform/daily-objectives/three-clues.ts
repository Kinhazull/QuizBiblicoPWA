import { GameType } from "../../../../shared/content";
import { dailyObjectiveGet } from "../../../_lib/daily-objective-api";

export const onRequestGet = dailyObjectiveGet(GameType.THREE_CLUES, "daily_three_clues_objective_failed");
