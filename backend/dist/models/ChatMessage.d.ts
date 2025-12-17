import { Pool } from 'pg';
import { Message, MessageType, ProcessingStatus, UserIntent, FunctionCall, FunctionResult, FileAttachment } from '../types/chat';
export declare class ChatMessage {
    private db;
    constructor(database: Pool);
    createMessage(userId: string, content: string, type?: MessageType, attachments?: FileAttachment[]): Promise<Message>;
    updateMessageWithAIResponse(messageId: string, aiResponse: {
        content: string;
        model: string;
        tokensUsed: number;
        processingTime: number;
        metadata?: Record<string, any>;
    }, extractedVocabulary?: string[], identifiedGrammar?: string[]): Promise<Message>;
    updateProcessingStatus(messageId: string, status: ProcessingStatus): Promise<void>;
    updateMessageWithFunctionCalls(messageId: string, detectedIntent: UserIntent, functionCalls: FunctionCall[], functionResults: FunctionResult[]): Promise<Message>;
    getMessageById(messageId: string): Promise<Message | null>;
    getChatHistory(userId: string, limit?: number, offset?: number, language?: string): Promise<{
        messages: Message[];
        totalCount: number;
    }>;
    getRecentMessages(userId: string, count?: number): Promise<Message[]>;
    deleteMessage(messageId: string, userId: string): Promise<boolean>;
    clearUserMessages(userId: string): Promise<number>;
    getPendingMessages(userId?: string): Promise<Message[]>;
    getMessagesByType(userId: string, type: MessageType, limit?: number): Promise<Message[]>;
    searchMessages(userId: string, searchTerm: string, limit?: number): Promise<Message[]>;
    private mapRowToMessage;
    private safeJsonParse;
}
//# sourceMappingURL=ChatMessage.d.ts.map