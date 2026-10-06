-- CreateTable
CREATE TABLE `ai_email_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source_email_message_id` INTEGER NULL,
    `message_id` VARCHAR(191) NULL,
    `thread_key` VARCHAR(191) NULL,
    `direction` ENUM('INBOUND', 'OUTBOUND') NOT NULL DEFAULT 'INBOUND',
    `sender` VARCHAR(191) NOT NULL,
    `recipients` JSON NOT NULL,
    `subject` VARCHAR(191) NULL,
    `normalized_body` TEXT NOT NULL,
    `received_at` DATETIME(3) NOT NULL,
    `status` ENUM('RECEIVED', 'NORMALIZED', 'CLASSIFIED', 'IGNORED_SPAM', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_email_messages_source_email_message_id_key`(`source_email_message_id`),
    INDEX `ai_email_messages_status_received_at_idx`(`status`, `received_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_email_classifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email_id` INTEGER NOT NULL,
    `spam` BOOLEAN NOT NULL,
    `needs_reply` BOOLEAN NOT NULL,
    `language` VARCHAR(16) NOT NULL,
    `intent` VARCHAR(32) NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `reason` VARCHAR(240) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `prompt_version` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_email_classifications_email_id_created_at_idx`(`email_id`, `created_at`),
    UNIQUE INDEX `ai_email_classifications_email_id_prompt_version_key`(`email_id`, `prompt_version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_email_drafts` (
    `provider` ENUM('OLLAMA', 'OPENAI') NOT NULL DEFAULT 'OLLAMA',
    `generation_error_code` VARCHAR(64) NULL,
    `generation_error_message` VARCHAR(500) NULL,
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email_id` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `subject` VARCHAR(500) NOT NULL,
    `body` TEXT NOT NULL,
    `reply_language` VARCHAR(16) NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `needs_manual_answer` BOOLEAN NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `prompt_version` VARCHAR(64) NOT NULL,
    `status` ENUM('GENERATED', 'EDITED', 'APPROVED', 'REJECTED', 'SPAM', 'SENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'GENERATED',
    `send_idempotency_key` VARCHAR(191) NULL,
    `send_attempts` INTEGER NOT NULL DEFAULT 0,
    `sent_email_message_id` INTEGER NULL,
    `sent_at` DATETIME(3) NULL,
    `send_error` VARCHAR(500) NULL,
    `rag_trace` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_email_drafts_send_idempotency_key_key`(`send_idempotency_key`),
    INDEX `ai_email_drafts_email_id_status_created_at_idx`(`email_id`, `status`, `created_at`),
    UNIQUE INDEX `ai_email_drafts_email_id_version_key`(`email_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_email_knowledge_refs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `draft_id` INTEGER NOT NULL,
    `knowledge_id` VARCHAR(191) NOT NULL,
    `source_url` VARCHAR(500) NOT NULL,
    `score` DOUBLE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_email_knowledge_refs_knowledge_id_idx`(`knowledge_id`),
    UNIQUE INDEX `ai_email_knowledge_refs_draft_id_knowledge_id_key`(`draft_id`, `knowledge_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_prompts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slot` ENUM('DRAFT_BODY', 'CLASSIFICATION') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `tags` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ai_prompts_slot_is_active_idx`(`slot`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_email_approvals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `draft_id` INTEGER NOT NULL,
    `draft_version` INTEGER NOT NULL,
    `action` ENUM('APPROVE', 'EDIT', 'REJECT', 'SPAM') NOT NULL,
    `actor_id` VARCHAR(191) NOT NULL,
    `edited_body` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_email_approvals_draft_id_created_at_idx`(`draft_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_runtime_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `draft_provider` ENUM('OLLAMA', 'OPENAI') NOT NULL DEFAULT 'OLLAMA',
    `draft_model` VARCHAR(191) NOT NULL,
    `updated_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_simulation_runs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `from_address` VARCHAR(320) NULL,
    `subject` VARCHAR(500) NOT NULL,
    `body` TEXT NOT NULL,
    `top_k` INTEGER NULL,
    `no_knowledge` BOOLEAN NOT NULL DEFAULT false,
    `force_draft` BOOLEAN NOT NULL DEFAULT false,
    `no_query_expansion` BOOLEAN NOT NULL DEFAULT false,
    `no_rerank` BOOLEAN NOT NULL DEFAULT false,
    `classification_prompt_id` INTEGER NULL,
    `classification_prompt_name` VARCHAR(191) NULL,
    `draft_body_prompt_id` INTEGER NULL,
    `draft_body_prompt_name` VARCHAR(191) NULL,
    `draft_provider` ENUM('OLLAMA', 'OPENAI') NULL,
    `draft_model` VARCHAR(191) NULL,
    `classification_spam` BOOLEAN NULL,
    `classification_needs_reply` BOOLEAN NULL,
    `classification_confidence` DOUBLE NULL,
    `classification_json` JSON NULL,
    `knowledge_json` JSON NULL,
    `draft_json` JSON NULL,
    `deterministic_spam_reason` VARCHAR(191) NULL,
    `draft_skipped_reason` VARCHAR(191) NULL,
    `created_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_simulation_runs_created_at_idx`(`created_at`),
    INDEX `ai_simulation_runs_draft_provider_draft_model_idx`(`draft_provider`, `draft_model`),
    INDEX `ai_simulation_runs_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_simulation_run_metrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `run_id` INTEGER NOT NULL,
    `stage` ENUM('CLASSIFICATION', 'QUERY_EXPANSION', 'RETRIEVAL_EMBEDDING', 'RERANK', 'DRAFT') NOT NULL,
    `provider` ENUM('OLLAMA', 'OPENAI') NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `call_count` INTEGER NOT NULL DEFAULT 1,
    `duration_ms` INTEGER NOT NULL,
    `prompt_tokens` INTEGER NULL,
    `completion_tokens` INTEGER NULL,
    `total_tokens` INTEGER NULL,
    `meta` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_simulation_run_metrics_run_id_idx`(`run_id`),
    INDEX `ai_simulation_run_metrics_stage_provider_model_idx`(`stage`, `provider`, `model`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `birthday` VARCHAR(191) NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `branch_Id` INTEGER NULL,
    `image` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,
    `anamnesis` VARCHAR(250) NULL,
    `social` VARCHAR(250) NULL,
    `description` VARCHAR(250) NULL,
    `image_3d` BOOLEAN NOT NULL DEFAULT false,
    `document` BOOLEAN NOT NULL DEFAULT false,
    `preferredLanguage` ENUM('EN', 'NL', 'RU') NOT NULL DEFAULT 'RU',

    INDEX `clients_branch_Id_fkey`(`branch_Id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_dance_groups` (
    `client_id` INTEGER NOT NULL,
    `group_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_dance_groups_group_id_idx`(`group_id`),
    PRIMARY KEY (`client_id`, `group_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `client_Id` INTEGER NOT NULL,
    `loyaltyLevel` ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM') NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `client_status_client_Id_fkey`(`client_Id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legal_organizations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `legalName` VARCHAR(191) NOT NULL,
    `kvkNumber` VARCHAR(191) NULL,
    `vatNumber` VARCHAR(191) NULL,
    `registrationAddress` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `countryCode` VARCHAR(191) NOT NULL DEFAULT 'NL',
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `iban` VARCHAR(191) NULL,
    `mollieOrganizationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `legal_organizations_mollieOrganizationId_key`(`mollieOrganizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `business_brands` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organizationId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `logoUrl` TEXT NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#1d1d33',
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `mollieProfileId` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `business_brands_slug_key`(`slug`),
    INDEX `business_brands_organizationId_isActive_idx`(`organizationId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(191) NOT NULL,
    `imap_host` VARCHAR(191) NOT NULL,
    `imap_port` INTEGER NOT NULL,
    `imap_secure` BOOLEAN NOT NULL DEFAULT true,
    `smtp_host` VARCHAR(191) NOT NULL,
    `smtp_port` INTEGER NOT NULL,
    `smtp_secure` BOOLEAN NOT NULL DEFAULT true,
    `username` VARCHAR(191) NOT NULL,
    `password_encrypted` TEXT NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `trash_folder` VARCHAR(191) NOT NULL DEFAULT 'Trash',
    `spam_folder` VARCHAR(191) NOT NULL DEFAULT 'Junk',
    `last_synced_uid` INTEGER NULL,
    `last_synced_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mailbox_id` INTEGER NOT NULL,
    `imap_uid` INTEGER NULL,
    `message_id` VARCHAR(191) NULL,
    `in_reply_to_message_id` VARCHAR(191) NULL,
    `is_outgoing` BOOLEAN NOT NULL DEFAULT false,
    `from_address` VARCHAR(191) NOT NULL,
    `from_name` VARCHAR(191) NULL,
    `reply_to_address` VARCHAR(191) NULL,
    `to_addresses` JSON NOT NULL,
    `cc_addresses` JSON NULL,
    `subject` VARCHAR(191) NULL,
    `body_text` TEXT NULL,
    `body_html` TEXT NULL,
    `received_at` DATETIME(3) NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `client_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_messages_client_id_idx`(`client_id`),
    INDEX `email_messages_from_address_idx`(`from_address`),
    UNIQUE INDEX `email_messages_mailbox_id_imap_uid_key`(`mailbox_id`, `imap_uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `message_id` INTEGER NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `storage_path` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_attachments_message_id_idx`(`message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `number` VARCHAR(191) NOT NULL,
    `documentType` ENUM('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE') NOT NULL DEFAULT 'INVOICE',
    `status` ENUM('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `clientId` INTEGER NULL,
    `businessBrandId` INTEGER NULL,
    `parentInvoiceId` INTEGER NULL,
    `billToName` VARCHAR(191) NOT NULL,
    `billToEmail` VARCHAR(191) NULL,
    `issueDate` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'EUR',
    `totalCents` INTEGER NOT NULL,
    `issuerName` VARCHAR(191) NOT NULL,
    `issuerAddress` VARCHAR(191) NULL,
    `issuerEmail` VARCHAR(191) NULL,
    `issuerPhone` VARCHAR(191) NULL,
    `issuerWebsite` VARCHAR(191) NULL,
    `issuerLegalName` VARCHAR(191) NULL,
    `issuerKvkNumber` VARCHAR(191) NULL,
    `issuerVatNumber` VARCHAR(191) NULL,
    `issuerLogoUrl` TEXT NULL,
    `issuerPrimaryColor` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `iban` VARCHAR(191) NULL,
    `paymentReference` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `showPaymentButton` BOOLEAN NOT NULL DEFAULT true,
    `showPaymentQr` BOOLEAN NOT NULL DEFAULT true,
    `paidAmountCents` INTEGER NOT NULL DEFAULT 0,
    `creditedAmountCents` INTEGER NOT NULL DEFAULT 0,
    `balanceDueCents` INTEGER NOT NULL,
    `createdById` INTEGER NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_number_key`(`number`),
    INDEX `invoices_clientId_idx`(`clientId`),
    INDEX `invoices_businessBrandId_idx`(`businessBrandId`),
    INDEX `invoices_parentInvoiceId_idx`(`parentInvoiceId`),
    INDEX `invoices_status_issueDate_idx`(`status`, `issueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_deliveries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `type` ENUM('INITIAL', 'RESEND', 'REMINDER_BEFORE_DUE', 'REMINDER_OVERDUE') NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `recipientEmail` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `publicToken` VARCHAR(191) NOT NULL,
    `paymentUrl` TEXT NULL,
    `errorMessage` TEXT NULL,
    `sentAt` DATETIME(3) NULL,
    `firstViewedAt` DATETIME(3) NULL,
    `lastViewedAt` DATETIME(3) NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoice_deliveries_publicToken_key`(`publicToken`),
    INDEX `invoice_deliveries_invoiceId_createdAt_idx`(`invoiceId`, `createdAt`),
    INDEX `invoice_deliveries_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `invoice_deliveries_type_createdAt_idx`(`type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `groupId` INTEGER NULL,
    `description` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPriceCents` INTEGER NOT NULL,
    `totalCents` INTEGER NOT NULL,

    INDEX `invoice_items_invoiceId_idx`(`invoiceId`),
    INDEX `invoice_items_groupId_idx`(`groupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `method` VARCHAR(191) NOT NULL DEFAULT 'OTHER',
    `reference` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `invoice_payments_invoiceId_paidAt_idx`(`invoiceId`, `paidAt`),
    INDEX `invoice_payments_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `oldValues` JSON NULL,
    `newValues` JSON NULL,
    `actorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `invoice_audit_logs_invoiceId_createdAt_idx`(`invoiceId`, `createdAt`),
    INDEX `invoice_audit_logs_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_documents` (
    `id` VARCHAR(191) NOT NULL,
    `source_type` VARCHAR(32) NOT NULL,
    `source_id` VARCHAR(500) NOT NULL,
    `source_url` VARCHAR(500) NOT NULL,
    `relative_path` VARCHAR(500) NULL,
    `folder_path` VARCHAR(500) NULL,
    `title` VARCHAR(500) NULL,
    `language` VARCHAR(16) NULL,
    `content_hash` VARCHAR(64) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'INACTIVE', 'ERROR') NOT NULL DEFAULT 'ACTIVE',
    `category` ENUM('BRAND', 'LOCATIONS', 'DANCE_STYLES', 'CLASSES', 'SCHEDULE', 'REGISTRATION', 'FAQ', 'CAMP', 'BUSINESS_RULES', 'SOURCES', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `priority` INTEGER NOT NULL DEFAULT 0,
    `tags` JSON NOT NULL,
    `kb_version` VARCHAR(8) NOT NULL DEFAULT 'v1',
    `error_message` VARCHAR(500) NULL,
    `last_synced_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `knowledge_documents_source_id_status_idx`(`source_id`, `status`),
    INDEX `knowledge_documents_content_hash_idx`(`content_hash`),
    INDEX `knowledge_documents_category_idx`(`category`),
    INDEX `knowledge_documents_kb_version_status_idx`(`kb_version`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_chunks` (
    `id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `ordinal` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `embedding` JSON NOT NULL,
    `embedding_model` VARCHAR(191) NOT NULL,
    `content_hash` VARCHAR(64) NOT NULL,
    `heading_path` JSON NOT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `knowledge_chunks_content_hash_idx`(`content_hash`),
    UNIQUE INDEX `knowledge_chunks_document_id_ordinal_key`(`document_id`, `ordinal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mollie_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_Id` INTEGER NOT NULL,
    `accessTokenEncrypted` TEXT NOT NULL,
    `refreshTokenEncrypted` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `scope` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastRefreshedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mollie_accounts_user_Id_key`(`user_Id`),
    INDEX `mollie_accounts_isActive_updatedAt_idx`(`isActive`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mollie_oauth_states` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state` VARCHAR(191) NOT NULL,
    `user_Id` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `mollie_oauth_states_state_key`(`state`),
    INDEX `mollie_oauth_states_user_Id_idx`(`user_Id`),
    INDEX `mollie_oauth_states_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mollie_incident_resolutions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `incidentKey` VARCHAR(191) NOT NULL,
    `incidentType` VARCHAR(191) NOT NULL,
    `sourceId` INTEGER NOT NULL,
    `resolvedBy_Id` INTEGER NOT NULL,
    `note` TEXT NULL,
    `resolvedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `mollie_incident_resolutions_incidentKey_key`(`incidentKey`),
    INDEX `mollie_incident_resolutions_incidentType_sourceId_idx`(`incidentType`, `sourceId`),
    INDEX `mollie_incident_resolutions_resolvedBy_Id_idx`(`resolvedBy_Id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mollieId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `givenName` VARCHAR(191) NULL,
    `familyName` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `streetAndNumber` VARCHAR(191) NULL,
    `consumerAccount` VARCHAR(191) NULL,
    `consumerName` VARCHAR(191) NULL,
    `consumerBic` VARCHAR(191) NULL,
    `payerName` VARCHAR(191) NULL,
    `payerRelation` VARCHAR(191) NULL DEFAULT 'unknown',
    `linkSource` VARCHAR(191) NOT NULL DEFAULT 'unlinked',
    `locale` VARCHAR(191) NULL,
    `preferredLanguage` ENUM('EN', 'NL', 'RU') NULL,
    `client_Id` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_mollieId_key`(`mollieId`),
    UNIQUE INDEX `Customer_email_key`(`email`),
    INDEX `customers_client_Id_fkey`(`client_Id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_client_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `clientId` INTEGER NOT NULL,
    `payerRelation` VARCHAR(191) NULL DEFAULT 'unknown',
    `linkSource` VARCHAR(191) NOT NULL DEFAULT 'unlinked',
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customer_client_links_client_Id_fkey`(`clientId`),
    UNIQUE INDEX `customer_client_links_customer_client_key`(`customerId`, `clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mandate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mollieId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `signatureDate` DATETIME(3) NULL,
    `customerId` INTEGER NOT NULL,
    `mandateReference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Mandate_mollieId_key`(`mollieId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mollieId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `amountValue` DECIMAL(65, 30) NOT NULL,
    `amountCurrency` VARCHAR(191) NOT NULL,
    `interval` VARCHAR(191) NOT NULL,
    `metadata` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NULL,
    `nextPaymentDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL,
    `mandateId` INTEGER NULL,
    `times` INTEGER NULL,
    `customerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Subscription_mollieId_key`(`mollieId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mollieId` VARCHAR(191) NULL,
    `amountValue` DECIMAL(65, 30) NOT NULL,
    `amountCurrency` VARCHAR(191) NOT NULL,
    `refundedAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `chargedBackAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `adjustmentAt` DATETIME(3) NULL,
    `description` VARCHAR(191) NULL,
    `method` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `checkoutUrl` TEXT NULL,
    `isCancelable` BOOLEAN NOT NULL DEFAULT false,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `customerId` INTEGER NULL,
    `subscriptionId` INTEGER NULL,
    `invoiceId` INTEGER NULL,

    UNIQUE INDEX `Payment_mollieId_key`(`mollieId`),
    INDEX `Payment_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_mollie_payment_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `mollieId` VARCHAR(191) NOT NULL,
    `paymentUrl` TEXT NOT NULL,
    `webhookToken` VARCHAR(191) NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoice_mollie_payment_links_mollieId_key`(`mollieId`),
    UNIQUE INDEX `invoice_mollie_payment_links_webhookToken_key`(`webhookToken`),
    INDEX `invoice_mollie_payment_links_invoiceId_archived_expiresAt_idx`(`invoiceId`, `archived`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mollie_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `molliePaymentId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL DEFAULT 'payment.webhook',
    `paymentStatus` VARCHAR(191) NULL,
    `processingStatus` VARCHAR(191) NOT NULL DEFAULT 'received',
    `dedupeKey` VARCHAR(191) NULL,
    `payload` JSON NULL,
    `errorMessage` TEXT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,
    `paymentId` INTEGER NULL,

    UNIQUE INDEX `mollie_events_dedupeKey_key`(`dedupeKey`),
    INDEX `mollie_events_molliePaymentId_receivedAt_idx`(`molliePaymentId`, `receivedAt`),
    INDEX `mollie_events_paymentId_idx`(`paymentId`),
    INDEX `mollie_events_processingStatus_idx`(`processingStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_reminder_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `offsetDays` INTEGER NOT NULL DEFAULT 3,
    `sendHour` INTEGER NOT NULL DEFAULT 9,
    `sendMinute` INTEGER NOT NULL DEFAULT 0,
    `senderEmailAccountId` INTEGER NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `updatedById` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_reminder_deliveries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriptionId` INTEGER NOT NULL,
    `targetPaymentDate` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `language` ENUM('EN', 'NL', 'RU') NOT NULL,
    `recipientEmail` VARCHAR(191) NOT NULL,
    `errorMessage` TEXT NULL,
    `sentAt` DATETIME(3) NULL,
    `triggeredById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payment_reminder_deliveries_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `payment_reminder_deliveries_subscriptionId_targetPaymentDate_key`(`subscriptionId`, `targetPaymentDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_reminder_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `language` ENUM('EN', 'NL', 'RU') NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `bodyHtml` TEXT NOT NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_reminder_templates_language_key`(`language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `choreographers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `firstNameUa` VARCHAR(191) NULL,
    `lastNameUa` VARCHAR(191) NULL,
    `firstNameEn` VARCHAR(191) NULL,
    `lastNameEn` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `birthday` VARCHAR(191) NULL,
    `experience` INTEGER NULL,
    `category` ENUM('START', 'FAN', 'PRO') NULL,
    `photo` VARCHAR(191) NULL,
    `mainPhoto` VARCHAR(191) NULL,
    `additionalPhotos` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `templateDescription` TEXT NULL,
    `showOnSite` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `halls` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `capacity` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dance_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `style` VARCHAR(191) NOT NULL,
    `level` ENUM('START', 'FAN', 'PRO') NOT NULL DEFAULT 'START',
    `maxParticipants` INTEGER NOT NULL DEFAULT 20,
    `lessonPriceCents` INTEGER NOT NULL DEFAULT 0,
    `choreographerId` INTEGER NOT NULL,
    `hallId` INTEGER NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_slots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupId` INTEGER NOT NULL,
    `dayOfWeek` VARCHAR(191) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dance_styles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `nameUa` VARCHAR(191) NULL,
    `nameEn` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `descriptionUa` TEXT NULL,
    `descriptionEn` TEXT NULL,
    `content` TEXT NULL,
    `contentUa` TEXT NULL,
    `contentEn` TEXT NULL,
    `image` VARCHAR(191) NULL,
    `youtubeUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `text` TEXT NULL,
    `client_Id` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `user_Id` INTEGER NULL,

    INDEX `comments_client_Id_fkey`(`client_Id`),
    INDEX `comments_user_Id_fkey`(`user_Id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `amount` DOUBLE NOT NULL,
    `category` ENUM('KOMUNALKA', 'AUTO', 'PRODUCTS', 'HEALTH', 'HUIS', 'PHARMACY', 'OTHER') NOT NULL,
    `description` VARCHAR(250) NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `paymentMethod` ENUM('CASH', 'CARD', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `telegram_notification_settings` (
    `key` VARCHAR(64) NOT NULL,
    `enabled` BOOLEAN NOT NULL,
    `updated_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `telegram_notification_settings_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `salt` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'DOCTOR') NOT NULL DEFAULT 'MANAGER',
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `authVersion` INTEGER NOT NULL DEFAULT 0,
    `lastLogin` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_Id` INTEGER NOT NULL,
    `refreshToken` VARCHAR(512) NULL,
    `tokenHash` VARCHAR(128) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `isRevoked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sessions_refreshToken_key`(`refreshToken`),
    UNIQUE INDEX `sessions_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_security_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'LOGIN_BLOCKED', 'LOGIN_TELEGRAM_SUCCEEDED', 'LOGIN_TELEGRAM_FAILED', 'TELEGRAM_LINKED', 'TELEGRAM_UNLINKED', 'LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'SESSION_CREATED', 'SESSION_ROTATED', 'SESSION_REVOKED', 'SESSION_REUSE_DETECTED', 'ROLE_CHANGED', 'ACCOUNT_CREATED', 'ACCOUNT_DISABLED', 'ACCOUNT_ENABLED', 'ACCOUNT_DELETED', 'TWO_FACTOR_REQUIRED', 'TWO_FACTOR_SUCCEEDED', 'TWO_FACTOR_FAILED', 'TWO_FACTOR_LOCKED', 'TWO_FACTOR_RESENT', 'TRUSTED_DEVICE_CREATED', 'TRUSTED_DEVICE_REVOKED', 'TELEGRAM_ADMIN_STUDENT_CREATED', 'TELEGRAM_ADMIN_MOLLIE_CUSTOMER_CREATED', 'TELEGRAM_ADMIN_SUBSCRIPTION_CREATED', 'TELEGRAM_ADMIN_PAYMENT_LINK_CREATED', 'TELEGRAM_MINIAPP_STUDENT_CREATED') NOT NULL,
    `actor_user_id` INTEGER NULL,
    `target_user_id` INTEGER NULL,
    `ipAddress` VARCHAR(64) NULL,
    `userAgent` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auth_security_events_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `auth_security_events_actor_user_id_createdAt_idx`(`actor_user_id`, `createdAt`),
    INDEX `auth_security_events_target_user_id_createdAt_idx`(`target_user_id`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `two_factor_challenges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `channel` ENUM('EMAIL', 'TELEGRAM') NOT NULL DEFAULT 'EMAIL',
    `token_hash` VARCHAR(128) NOT NULL,
    `code_hash` VARCHAR(128) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL DEFAULT 5,
    `resend_count` INTEGER NOT NULL DEFAULT 0,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `two_factor_challenges_token_hash_key`(`token_hash`),
    INDEX `two_factor_challenges_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trusted_devices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `token_hash` VARCHAR(128) NOT NULL,
    `user_agent` VARCHAR(191) NULL,
    `ip_address` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `last_used_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,

    UNIQUE INDEX `trusted_devices_token_hash_key`(`token_hash`),
    INDEX `trusted_devices_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_identities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `provider` ENUM('TELEGRAM', 'TELEGRAM_MINIAPP') NOT NULL,
    `provider_user_id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NULL,
    `display_name` VARCHAR(191) NULL,
    `linked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_login_at` DATETIME(3) NULL,

    INDEX `auth_identities_user_id_idx`(`user_id`),
    UNIQUE INDEX `auth_identities_provider_provider_user_id_key`(`provider`, `provider_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `telegram_auth_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state` VARCHAR(191) NOT NULL,
    `nonce_hash` VARCHAR(128) NOT NULL,
    `code_verifier` VARCHAR(191) NOT NULL,
    `flow` ENUM('LOGIN', 'LINK') NOT NULL,
    `user_id` INTEGER NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `telegram_auth_transactions_state_key`(`state`),
    INDEX `telegram_auth_transactions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_email_classifications` ADD CONSTRAINT `ai_email_classifications_email_id_fkey` FOREIGN KEY (`email_id`) REFERENCES `ai_email_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_email_drafts` ADD CONSTRAINT `ai_email_drafts_email_id_fkey` FOREIGN KEY (`email_id`) REFERENCES `ai_email_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_email_knowledge_refs` ADD CONSTRAINT `ai_email_knowledge_refs_draft_id_fkey` FOREIGN KEY (`draft_id`) REFERENCES `ai_email_drafts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_email_approvals` ADD CONSTRAINT `ai_email_approvals_draft_id_fkey` FOREIGN KEY (`draft_id`) REFERENCES `ai_email_drafts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_runtime_settings` ADD CONSTRAINT `ai_runtime_settings_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_simulation_runs` ADD CONSTRAINT `ai_simulation_runs_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_simulation_run_metrics` ADD CONSTRAINT `ai_simulation_run_metrics_run_id_fkey` FOREIGN KEY (`run_id`) REFERENCES `ai_simulation_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_branch_Id_fkey` FOREIGN KEY (`branch_Id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_dance_groups` ADD CONSTRAINT `client_dance_groups_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_dance_groups` ADD CONSTRAINT `client_dance_groups_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `dance_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_status` ADD CONSTRAINT `client_status_client_Id_fkey` FOREIGN KEY (`client_Id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_brands` ADD CONSTRAINT `business_brands_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `legal_organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_messages` ADD CONSTRAINT `email_messages_mailbox_id_fkey` FOREIGN KEY (`mailbox_id`) REFERENCES `email_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_messages` ADD CONSTRAINT `email_messages_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_attachments` ADD CONSTRAINT `email_attachments_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `email_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_businessBrandId_fkey` FOREIGN KEY (`businessBrandId`) REFERENCES `business_brands`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_parentInvoiceId_fkey` FOREIGN KEY (`parentInvoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_deliveries` ADD CONSTRAINT `invoice_deliveries_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_deliveries` ADD CONSTRAINT `invoice_deliveries_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `dance_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_payments` ADD CONSTRAINT `invoice_payments_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_payments` ADD CONSTRAINT `invoice_payments_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_audit_logs` ADD CONSTRAINT `invoice_audit_logs_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_audit_logs` ADD CONSTRAINT `invoice_audit_logs_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `knowledge_chunks` ADD CONSTRAINT `knowledge_chunks_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `knowledge_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mollie_accounts` ADD CONSTRAINT `mollie_accounts_user_Id_fkey` FOREIGN KEY (`user_Id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mollie_oauth_states` ADD CONSTRAINT `mollie_oauth_states_user_Id_fkey` FOREIGN KEY (`user_Id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mollie_incident_resolutions` ADD CONSTRAINT `mollie_incident_resolutions_resolvedBy_Id_fkey` FOREIGN KEY (`resolvedBy_Id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_client_Id_fkey` FOREIGN KEY (`client_Id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_client_links` ADD CONSTRAINT `customer_client_links_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_client_links` ADD CONSTRAINT `customer_client_links_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mandate` ADD CONSTRAINT `Mandate_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_mandateId_fkey` FOREIGN KEY (`mandateId`) REFERENCES `Mandate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_mollie_payment_links` ADD CONSTRAINT `invoice_mollie_payment_links_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mollie_events` ADD CONSTRAINT `mollie_events_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_reminder_settings` ADD CONSTRAINT `payment_reminder_settings_senderEmailAccountId_fkey` FOREIGN KEY (`senderEmailAccountId`) REFERENCES `email_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_reminder_settings` ADD CONSTRAINT `payment_reminder_settings_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_reminder_deliveries` ADD CONSTRAINT `payment_reminder_deliveries_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_reminder_deliveries` ADD CONSTRAINT `payment_reminder_deliveries_triggeredById_fkey` FOREIGN KEY (`triggeredById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_reminder_templates` ADD CONSTRAINT `payment_reminder_templates_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dance_groups` ADD CONSTRAINT `dance_groups_choreographerId_fkey` FOREIGN KEY (`choreographerId`) REFERENCES `choreographers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dance_groups` ADD CONSTRAINT `dance_groups_hallId_fkey` FOREIGN KEY (`hallId`) REFERENCES `halls`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dance_groups` ADD CONSTRAINT `dance_groups_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_slots` ADD CONSTRAINT `schedule_slots_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `dance_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_client_Id_fkey` FOREIGN KEY (`client_Id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_user_Id_fkey` FOREIGN KEY (`user_Id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telegram_notification_settings` ADD CONSTRAINT `telegram_notification_settings_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_Id_fkey` FOREIGN KEY (`user_Id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_security_events` ADD CONSTRAINT `auth_security_events_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_security_events` ADD CONSTRAINT `auth_security_events_target_user_id_fkey` FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `two_factor_challenges` ADD CONSTRAINT `two_factor_challenges_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trusted_devices` ADD CONSTRAINT `trusted_devices_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_identities` ADD CONSTRAINT `auth_identities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telegram_auth_transactions` ADD CONSTRAINT `telegram_auth_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
