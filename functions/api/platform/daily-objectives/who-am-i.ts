import { GameType } from "../../../../shared/content";
import { dailyObjectiveGet } from "../../../_lib/daily-objective-api";

export const onRequestGet = dailyObjectiveGet(GameType.WHO_AM_I, "daily_who_am_i_objective_failed");
