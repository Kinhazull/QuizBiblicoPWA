import type { CoreEventConsumer } from "./platform-event-engine";
import { platformStatisticsConsumer } from "./platform-statistics";
import { platformRewardConsumer } from "./platform-rewards";
import { platformAchievementConsumer } from "./platform-achievement-consumer";
import { platformMissionConsumer } from "./platform-mission-consumer";

export const CORE_PLATFORM_EVENT_CONSUMERS: readonly CoreEventConsumer[] = [
  platformStatisticsConsumer,
  platformRewardConsumer,
  platformAchievementConsumer,
  platformMissionConsumer,
];
