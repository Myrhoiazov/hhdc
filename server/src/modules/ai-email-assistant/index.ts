export {
    classifyEmail,
    deterministicSpamReason,
    emailClassificationSchema,
    normalizeEmail,
    type ClassifiedEmail,
    type EmailClassification,
    type EmailClassificationInput,
    type LlmClient,
    type NormalizedEmailInput,
} from './email-assistant.service';
export { OllamaLlmClient, type OllamaLlmClientOptions } from './ollama.client';
export {
    CLASSIFICATION_PROMPT_VERSION,
    DETERMINISTIC_SPAM_PROMPT_VERSION,
    createPrismaAiEmailRepository,
    persistClassification,
    persistNormalizedEmail,
    type AiEmailRepository,
    type NormalizedEmailRecord,
} from './email-assistant.persistence';
export { classifyPendingAiEmails, type ClassificationRunResult } from './email-assistant.worker';
export { startAiEmailClassificationCron } from './email-assistant.cron.service';
export {
    buildDraftContext,
    emailDraftSchema,
    generateEmailDraft,
    type CrmContactProjection,
    type CrmReader,
    type DraftContext,
    type DraftKnowledgeContext,
    type DraftLlmClient,
    type EmailDraft,
} from './draft.service';
export { createPrismaCrmReader } from './crm-context.service';
export { buildDraftApprovalNotification, notifyDraftForApproval, type DraftApprovalNotificationInput } from './telegram-notification.service';
export { runDraftPipeline, createPrismaDraftPipelineRepository, type DraftPipelineRepository, type DraftPipelineRunResult } from './draft-pipeline.service';
export { startAiEmailDraftCron } from './draft-pipeline.cron.service';
export {
    applyDraftAction,
    draftActionSchema,
    parseAllowedTelegramActors,
    type DraftAction,
    type DraftApprovalRepository,
} from './approval.service';
export {
    createPrismaAiEmailDraftRepository,
    createPrismaDraftApprovalRepository,
    persistDraft,
    DRAFT_PROMPT_VERSION,
    type AiEmailDraftRepository,
    type DraftKnowledgeRefInput,
    type DraftRecord,
} from './draft.persistence';
export {
    buildSendIdempotencyKey,
    draftBodyToHtml,
    runSendPipeline,
    type EmailSender,
    type SendCandidate,
    type SendPipelineRepository,
    type SendPipelineRunResult,
} from './send-pipeline.service';
export { createEmailSmtpSender, createPrismaSendPipelineRepository } from './send.persistence';
export { startAiEmailSendCron } from './send-pipeline.cron.service';
export {
    handleTelegramApprovalUpdate,
    telegramWebhookSecretIsValid,
    buildDraftCallbackData,
    parseDraftCallbackData,
    parseDraftEditCommand,
    type TelegramApprovalUpdate,
} from './telegram-approval.controller';
export {
    fetchTelegramUpdates,
    pollTelegramApprovalUpdatesOnce,
    startTelegramApprovalPolling,
} from './telegram-approval.polling.service';
