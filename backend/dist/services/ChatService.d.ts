import { Pool } from 'pg';
import { Message, SendMessageRequest, SendMessageResponse, UploadMaterialRequest, UploadMaterialResponse, ChatHistoryResponse } from '../types/chat';
export declare class ChatService {
    private chatMessage;
    private aiService;
    private asyncTaskManager;
    constructor(database: Pool, testMode?: boolean);
    sendMessage(userId: string, request: SendMessageRequest): Promise<SendMessageResponse>;
    sendMessageAsync(userId: string, request: SendMessageRequest): Promise<SendMessageResponse>;
    uploadMaterial(userId: string, file: Express.Multer.File, request: UploadMaterialRequest): Promise<UploadMaterialResponse>;
    uploadMaterialAsync(userId: string, file: Express.Multer.File, request: UploadMaterialRequest): Promise<UploadMaterialResponse>;
    getChatHistory(userId: string, limit?: number, offset?: number, language?: string): Promise<ChatHistoryResponse>;
    clearChatHistory(userId: string): Promise<{
        success: boolean;
        deletedCount?: number;
        error?: string;
    }>;
    getMessageById(messageId: string): Promise<Message | null>;
    searchMessages(userId: string, searchTerm: string, limit?: number): Promise<{
        success: boolean;
        messages?: Message[];
        error?: string;
    }>;
    private extractFileContent;
    private extractLearningData;
    private getModelForTask;
    private cleanupFile;
}
//# sourceMappingURL=ChatService.d.ts.map