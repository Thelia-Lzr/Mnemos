"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ChatController_1 = require("../controllers/ChatController");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const chatController = new ChatController_1.ChatController();
const upload = (0, multer_1.default)({
    dest: process.env.UPLOAD_DIR || 'uploads/',
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760')
    }
});
router.use(auth_1.authenticate);
router.post('/message', chatController.sendMessage.bind(chatController));
router.post('/upload-material', upload.single('file'), chatController.uploadMaterial.bind(chatController));
router.get('/history', chatController.getChatHistory.bind(chatController));
router.post('/message-async', chatController.sendMessageAsync.bind(chatController));
router.post('/upload-material-async', upload.single('file'), chatController.uploadMaterialAsync.bind(chatController));
router.post('/function-call', chatController.executeFunction.bind(chatController));
router.post('/function-call-async', chatController.executeFunctionAsync.bind(chatController));
router.post('/parse-intent', chatController.parseIntent.bind(chatController));
router.get('/available-functions', chatController.getAvailableFunctions.bind(chatController));
router.delete('/history', chatController.clearChatHistory.bind(chatController));
router.get('/search', chatController.searchMessages.bind(chatController));
exports.default = router;
//# sourceMappingURL=chatRoutes.js.map