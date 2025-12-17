"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const ChatService_1 = require("../services/ChatService");
const AIFunctionService_1 = require("../services/AIFunctionService");
const database_1 = require("../config/database");
class ChatController {
    constructor() {
        this.chatService = new ChatService_1.ChatService(database_1.pool);
        this.aiFunctionService = new AIFunctionService_1.AIFunctionService(database_1.pool, false);
    }
    async sendMessage(req, res, next) {
        try {
            const userId = req.user.id;
            const request = req.body;
            if (!request.content || typeof request.content !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'Message content is required'
                });
                return;
            }
            const result = await this.chatService.sendMessage(userId, request);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            next(error);
        }
    }
    async uploadMaterial(req, res, next) {
        try {
            const userId = req.user.id;
            const file = req.file;
            const request = req.body;
            if (!file) {
                res.status(400).json({
                    success: false,
                    error: 'File is required'
                });
                return;
            }
            const result = await this.chatService.uploadMaterial(userId, file, request);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            next(error);
        }
    }
    async getChatHistory(req, res, next) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const language = req.query.language;
            const result = await this.chatService.getChatHistory(userId, limit, offset, language);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            next(error);
        }
    }
    async sendMessageAsync(req, res, next) {
        try {
            const userId = req.user.id;
            const request = req.body;
            if (!request.content || typeof request.content !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'Message content is required'
                });
                return;
            }
            const result = await this.chatService.sendMessageAsync(userId, request);
            if (result.success) {
                res.status(202).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            next(error);
        }
    }
    async uploadMaterialAsync(req, res, next) {
        try {
            const userId = req.user.id;
            const file = req.file;
            const request = req.body;
            if (!file) {
                res.status(400).json({
                    success: false,
                    error: 'File is required'
                });
                return;
            }
            const result = await this.chatService.uploadMaterialAsync(userId, file, request);
            if (result.success) {
                res.status(202).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            next(error);
        }
    }
    async executeFunction(req, res, next) {
        try {
            const userId = req.user.id;
            const request = req.body;
            if (!request.intent) {
                res.status(400).json({
                    success: false,
                    error: 'Intent is required'
                });
                return;
            }
            const result = await this.aiFunctionService.executeFunction(userId, request);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            next(error);
        }
    }
    async executeFunctionAsync(req, res, next) {
        try {
            const userId = req.user.id;
            const request = req.body;
            if (!request.intent) {
                res.status(400).json({
                    success: false,
                    error: 'Intent is required'
                });
                return;
            }
            const result = await this.aiFunctionService.executeFunctionAsync(userId, request);
            if (result.success) {
                res.status(202).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            next(error);
        }
    }
    async parseIntent(req, res, next) {
        try {
            const userId = req.user.id;
            const request = req.body;
            if (!request.message || typeof request.message !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'Message is required'
                });
                return;
            }
            const result = await this.aiFunctionService.parseIntent(userId, request);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            next(error);
        }
    }
    async getAvailableFunctions(req, res, next) {
        try {
            const result = await this.aiFunctionService.getAvailableFunctions();
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            next(error);
        }
    }
    async clearChatHistory(req, res, next) {
        try {
            const userId = req.user.id;
            const result = await this.chatService.clearChatHistory(userId);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            next(error);
        }
    }
    async searchMessages(req, res, next) {
        try {
            const userId = req.user.id;
            const searchTerm = req.query.q;
            const limit = parseInt(req.query.limit) || 20;
            if (!searchTerm) {
                res.status(400).json({
                    success: false,
                    error: 'Search term is required'
                });
                return;
            }
            const result = await this.chatService.searchMessages(userId, searchTerm, limit);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ChatController = ChatController;
//# sourceMappingURL=ChatController.js.map