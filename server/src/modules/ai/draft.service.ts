import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { configuredAiProvider } from './registry';
import { retrieveKnowledge } from '../knowledge/service';
import { ApiError } from '../../common/http';
import { AiDraft } from '@prisma/client';

const classificationSchema = z.object({
    intent: z.string().describe('The main intent or category of the email (e.g., QUESTION, REFUND, TICKET_ISSUE)'),
    language: z.string().describe('The ISO 639-1 language code (e.g., en, ru)'),
    confidence: z.number().min(0).max(1).describe('Confidence score from 0.0 to 1.0')
});

export const generateDraft = async (conversationId: string, userId: string): Promise<AiDraft> => {
    // 1. Fetch conversation and the latest inbound message
    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
            person: true,
            event: true,
            messages: {
                where: { direction: 'INBOUND' },
                orderBy: { receivedAt: 'desc' },
                take: 1
            }
        }
    });

    if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    
    const inboundMessage = conversation.messages[0];
    if (!inboundMessage) throw new ApiError(400, 'NO_INBOUND_MESSAGE', 'No inbound message to reply to');
    
    // 2. Classify intent
    const { provider } = await configuredAiProvider(false);
    
    let classification: { intent: string; language: string; confidence: number };
    try {
        classification = await provider.generateStructured<{ intent: string; language: string; confidence: number }>(
            `Classify the following email:\n\n${inboundMessage.bodyText || inboundMessage.subject}`,
            { schema: classificationSchema, systemPrompt: 'Classify the email. JSON keys: "intent" (UPPER_SNAKE_CASE category such as QUESTION, REFUND_REQUEST, TICKET_ISSUE), "language" (ISO 639-1 code), "confidence" (number from 0 to 1).' }
        );
    } catch (e) {
        // Classification is advisory: the draft is still generated and reviewed by a human.
        classification = { intent: 'UNKNOWN', language: 'en', confidence: 0.5 };
    }

    // 3. Retrieve context (RAG)
    const query = inboundMessage.bodyText ? inboundMessage.bodyText.substring(0, 500) : (inboundMessage.subject || '');
    const knowledgeChunks = await retrieveKnowledge(query, conversation.eventId);
    
    const contextText = knowledgeChunks.map(c => `[${c.title}] ${c.content}`).join('\n\n');
    
    const promptVersion = '1.0';
    const systemPrompt = `You are a helpful customer support assistant for High Heels Dance Camp.
Reply to the customer's email in their language (${classification.language}).
Use the following knowledge base information if helpful:
${contextText}

Customer Name: ${conversation.person.firstName} ${conversation.person.lastName}
Event: ${conversation.event?.name || 'General'}`;

    // 4. Generate the draft
    const content = await provider.generateText(
        `Write a polite and helpful reply to this email:\n\n${inboundMessage.bodyText || inboundMessage.subject}`,
        systemPrompt
    );

    const contextSnapshot = {
        classification,
        knowledgeUsed: knowledgeChunks.map(c => c.id),
        promptVersion
    };

    // 5. Save the draft
    const draft = await prisma.aiDraft.create({
        data: {
            conversationId: conversation.id,
            sourceMessageId: inboundMessage.id,
            status: 'GENERATED',
            language: classification.language,
            intent: classification.intent,
            confidence: classification.confidence,
            model: provider.model || 'unknown',
            promptVersion,
            content,
            contextSnapshot,
            createdBy: userId
        }
    });

    // 6. Audit logging
    await prisma.auditLog.create({
        data: {
            actorUserId: userId,
            action: 'AI_DRAFT_GENERATED',
            entityType: 'AiDraft',
            entityId: draft.id
        }
    });

    return draft;
};
