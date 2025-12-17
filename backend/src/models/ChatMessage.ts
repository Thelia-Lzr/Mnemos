import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Message, MessageType, ProcessingStatus, UserIntent, FunctionCall, FunctionResult, FileAttachment } from '../types/chat';

export class ChatMessage {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  /**
   * Create a new chat message
   */
  async createMessage(
    userId: string,
    content: string,
    type: MessageType = MessageType.USER_TEXT,
    attachments?: FileAttachment[]
  ): Promise<Message> {
    const id = uuidv4();
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
      ProcessingStatus.PENDING,
      attachments ? JSON.stringify(attachments) : null,
      timestamp
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToMessage(result.rows[0]);
  }

  /**
   * Update message with AI response
   */
  async updateMessageWithAIResponse(
    messageId: string,
    aiResponse: {
      content: string;
      model: string;
      tokensUsed: number;
      processingTime: number;
      metadata?: Record<string, any>;
    },
    extractedVocabulary?: string[],
    identifiedGrammar?: string[]
  ): Promise<Message> {
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
      ProcessingStatus.COMPLETED,
      extractedVocabulary || null,
      identifiedGrammar || null
    ];

    const result = await this.db.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Message with id ${messageId} not found`);
    }

    return this.mapRowToMessage(result.rows[0]);
  }

  /**
   * Update message processing status
   */
  async updateProcessingStatus(messageId: string, status: ProcessingStatus): Promise<void> {
    const query = `
      UPDATE chat_messages 
      SET processing_status = $2
      WHERE id = $1
    `;

    await this.db.query(query, [messageId, status]);
  }

  /**
   * Update message with function call results
   */
  async updateMessageWithFunctionCalls(
    messageId: string,
    detectedIntent: UserIntent,
    functionCalls: FunctionCall[],
    functionResults: FunctionResult[]
  ): Promise<Message> {
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
      ProcessingStatus.COMPLETED
    ];

    const result = await this.db.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Message with id ${messageId} not found`);
    }

    return this.mapRowToMessage(result.rows[0]);
  }

  /**
   * Get message by ID
   */
  async getMessageById(messageId: string): Promise<Message | null> {
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

  /**
   * Get chat history for a user
   */
  async getChatHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    language?: string
  ): Promise<{ messages: Message[]; totalCount: number }> {
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM chat_messages 
      WHERE user_id = $1
    `;
    const countResult = await this.db.query(countQuery, [userId]);
    const totalCount = parseInt(countResult.rows[0].total);

    // Get messages
    const query = `
      SELECT * FROM chat_messages 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.db.query(query, [userId, limit, offset]);
    const messages = result.rows.map(row => this.mapRowToMessage(row));

    return {
      messages: messages.reverse(), // Return in chronological order
      totalCount
    };
  }

  /**
   * Get recent messages for context
   */
  async getRecentMessages(userId: string, count: number = 10): Promise<Message[]> {
    const query = `
      SELECT * FROM chat_messages 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await this.db.query(query, [userId, count]);
    return result.rows.map(row => this.mapRowToMessage(row)).reverse();
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM chat_messages 
      WHERE id = $1 AND user_id = $2
    `;

    const result = await this.db.query(query, [messageId, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Clear all messages for a user
   */
  async clearUserMessages(userId: string): Promise<number> {
    const query = `
      DELETE FROM chat_messages 
      WHERE user_id = $1
    `;

    const result = await this.db.query(query, [userId]);
    return result.rowCount ?? 0;
  }

  /**
   * Get messages with pending processing status
   */
  async getPendingMessages(userId?: string): Promise<Message[]> {
    let query = `
      SELECT * FROM chat_messages 
      WHERE processing_status = $1
    `;
    const values: any[] = [ProcessingStatus.PENDING];

    if (userId) {
      query += ` AND user_id = $2`;
      values.push(userId);
    }

    query += ` ORDER BY created_at ASC`;

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapRowToMessage(row));
  }

  /**
   * Get messages by type
   */
  async getMessagesByType(userId: string, type: MessageType, limit: number = 20): Promise<Message[]> {
    const query = `
      SELECT * FROM chat_messages 
      WHERE user_id = $1 AND type = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;

    const result = await this.db.query(query, [userId, type, limit]);
    return result.rows.map(row => this.mapRowToMessage(row));
  }

  /**
   * Search messages by content
   */
  async searchMessages(
    userId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<Message[]> {
    const query = `
      SELECT * FROM chat_messages 
      WHERE user_id = $1 AND content ILIKE $2
      ORDER BY created_at DESC
      LIMIT $3
    `;

    const result = await this.db.query(query, [userId, `%${searchTerm}%`, limit]);
    return result.rows.map(row => this.mapRowToMessage(row));
  }

  /**
   * Map database row to Message object
   */
  private mapRowToMessage(row: any): Message {
    return {
      id: row.id,
      userId: row.user_id,
      content: row.content,
      type: row.type as MessageType,
      timestamp: row.created_at,
      aiResponse: row.ai_response ? this.safeJsonParse(row.ai_response) : undefined,
      processingStatus: row.processing_status as ProcessingStatus,
      detectedIntent: row.detected_intent as UserIntent,
      functionCalls: row.function_calls ? this.safeJsonParse(row.function_calls) : undefined,
      functionResults: row.function_results ? this.safeJsonParse(row.function_results) : undefined,
      attachments: row.attachments ? this.safeJsonParse(row.attachments) : undefined,
      extractedVocabulary: row.extracted_vocabulary || undefined,
      identifiedGrammar: row.identified_grammar || undefined
    };
  }

  /**
   * Safely parse JSON, handling cases where the value might already be an object
   */
  private safeJsonParse(value: any): any {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        console.warn('Failed to parse JSON:', error);
        return value;
      }
    }
    return value;
  }
}
