import { ContentStatus } from "../../../../../shared/content";
import { handleUniversalContentStatusTransition } from "../../../../_lib/universal-content-status-handler";
export const onRequestPost = (context: Parameters<typeof handleUniversalContentStatusTransition>[0]) =>
  handleUniversalContentStatusTransition(context, ContentStatus.IN_REVIEW);
