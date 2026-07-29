import { ContentStatus } from "../../../../../shared/content";
import type { AppEnv } from "../../../../_lib/auth";
import { handleUniversalContentStatusTransition } from "../../../../_lib/universal-content-status-handler";

type Context = { request: Request; env: AppEnv; params: { id: string } };

export const onRequestPost = (context: Context) =>
  handleUniversalContentStatusTransition(context, ContentStatus.DRAFT);
