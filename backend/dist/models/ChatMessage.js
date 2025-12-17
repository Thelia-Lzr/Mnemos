"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessage = void 0;
const uuid_1 = require("uuid");
const chat_1 = require("../types/chat");
class ChatMessage {
    constructor(database) {
        this.db = database;
    }
    async createMessage(userId, content, type = chat_1.MessageType.USER_TEXT, attachments) {
        const id = (0, uuid_1.v4)();
        const timestamp = new Date();
        const query = `
      INSERT INTO chat_messages (
        id, user_id, content, type, processing_status, attachments, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const values = [
            id,
            userId,
            content,
            type,
            chat_1.ProcessingStatus.PENDING,
            attachments ? JSON.stringify(attachments) : null,
            timestamp
        ];
        const result = await this.db.query(query, values);
        return this.mapRowToMessage(result.rows[0]);
    }
    async updateMessageWithAIResponse(messageId, aiResponse, extractedVocabulary, identifiedGrammar) {
        const query = `
      UPDATE chat_messages 
      SET 
        ai_response = $2,
        processing_status = $3,
        extracted_vocabulary = $4,
        identified_grammar = $5
      WHERE id = $1
      RETURNING *
    `;
        const values = [
            messageId,
            JSON.stringify(aiResponse),
            chat_1.ProcessingStatus.COMPLETED,
            extractedVocabulary || null,
            identifiedGrammar || null
        ];
        const result = await this.db.query(query, values);
        if (result.rows.length === 0) {
            throw new Error(`Message with id ${messageId} not found`);
        }
        return this.mapRowToMessage(result.rows[0]);
    }
    async updateProcessingStatus(messageId, status) {
        const query = `
      UPDATE chat_messages 
      SET processing_status = $2
      WHERE id = $1
    `;
        await this.db.query(query, [messageId, status]);
    }
    async updateMessageWithFunctionCalls(messageId, detectedIntent, functionCalls, functionResults) {
        const query = `
      UPDATE chat_messages 
      SET 
        detected_intent = $2,
        function_calls = $3,
        function_results = $4,
        processing_status = $5
      WHERE id = $1
      RETURNING *
    `;
        const values = [
            messageId,
            detectedIntent,
            JSON.stringify(functionCalls),
            JSON.stringify(functionResults),
            chat_1.ProcessingStatus.COMPLETED
        ];
        const result = await this.db.query(query, values);
        if (result.rows.length === 0) {
            throw new Error(`Message with id ${messageId} not found`);
        }
        return this.mapRowToMessage(result.rows[0]);
    }
    async getMessageById(messageId) {
        const query = `
      SELECT * FROM chat_messages 
      WHERE id = $1
    `;
        const result = await this.db.query(query, [messageId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToMessage(result.rows[0]);
    }
    async getChatHistory(userId, limit = 50, offset = 0, language) {
        const countQuery = `
      SELECT COUNT(*) as total 
      FROM chat_messages 
      WHERE user_id = $1
    `;
        const countResult = await this.db.query(countQuery, [userId]);
        const totalCount = parseInt(countResult.rows[0].total);
        const query = `
      SELECT * FROM chat_messages 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
        const result = await this.db.query(query, [userId, limit, offset]);
        const messages = result.rows.map(row => this.mapRowToMessage(row));
        return {
            messages: messages.reverse(),
            totalCount
        };
    }
    async getRecentMessages(userId, count = 10) {
        const query = `
      SELECT * FROM chat_messages 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
        const result = await this.db.query(query, [userId, count]);
        return result.rows.map(row => this.mapRowToMessage(row)).reverse();
    }
    async deleteMessage(messageId, userId) {
        const query = `
      DELETE FROM chat_messages 
      WHERE id = $1 AND user_id = $2
    `;
        const result = await this.db.query(query, [messageId, userId]);
        return (result.rowCount ?? 0) > 0;
    }
    async clearUserMessages(userId) {
        const query = `
      DELETE FROM chat_messages 
      WHERE user_id = $1
    `;
        const result = await this.db.query(query, [userId]);
        return result.rowCount ?? 0;
    }
    async getPendingMessages(userId) {
        let query = `
      SELECT * FROM chat_messages 
      WHERE processing_status = $1
    `;
        const values = [chat_1.ProcessingStatus.PENDING];
        if (userId) {
            query += ` AND user_id = $2`;
            values.push(userId);
        }
        query += ` ORDER BY created_at ASC`;
        const result = await this.db.query(query, values);
        return result.rows.map(row => this.mapRowToMessage(row));
    }
    async getMessagesByType(userId, type, limit = 20) {
        const query = `
      SELECT * FROM chat_messages 
      WHERE user_id = $1 AND type = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;
        const result = await this.db.query(query, [userId, type, limit]);
        return result.rows.map(row => this.mapRowToMessage(row));
    }
    async searchMessages(userId, searchTerm, limit = 20) {
        const query = `
      SELECT * FROM chat_messages 
      WHERE user_id = $1 AND content ILIKE $2
      ORDER BY created_at DESC
      LIMIT $3
    `;
        const result = await this.db.query(query, [userId, `%${searchTerm}%`, limit]);
        return result.rows.map(row => this.mapRowToMessage(row));
    }
    mapRowToMessage(row) {
        return {
            id: row.id,
            userId: row.user_id,
            content: row.content,
            type: row.type,
            timestamp: row.created_at,
            aiResponse: row.ai_response ? this.safeJsonParse(row.ai_response) : undefined,
            processingStatus: row.processing_status,
            detectedIntent: row.detected_intent,
            functionCalls: row.function_calls ? this.safeJsonParse(row.function_calls) : undefined,
            functionResults: row.function_results ? this.safeJsonParse(row.function_results) : undefined,
            attachments: row.attachments ? this.safeJsonParse(row.attachments) : undefined,
            extractedVocabulary: row.extracted_vocabulary || undefined,
            identifiedGrammar: row.identified_grammar || undefined
        };
    }
    safeJsonParse(value) {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            }
            catch (error) {
                console.warn('Failed to parse JSON:', error);
                return value;
            }
        }
        return value;
    }
}
exports.ChatMessage = ChatMessage;
//# sourceMappingURL=ChatMessage.js.map