import { GameType } from "../../../../shared/content";
import { dailyObjectiveGet } from "../../../_lib/daily-objective-api";

export const onRequestGet = dailyObjectiveGet(GameType.QUIZ, "daily_quiz_objective_failed");

