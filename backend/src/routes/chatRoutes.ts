import { Router } from 'express';
import { ChatController } from '../controllers/ChatController';
import { authenticate } from '../middleware/auth';
import multer from 'multer';

const router = Router();
const chatController = new ChatController();

// Configure multer for file uploads
const upload = multer({
  dest: process.env.UPLOAD_DIR || 'uploads/',
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB
  }
});

// All chat routes require authentication
router.use(authenticate);

// Synchronous chat endpoints
router.post('/message', chatController.sendMessage.bind(chatController));
router.post('/upload-material', upload.single('file'), chatController.uploadMaterial.bind(chatController));
router.get('/history', chatController.getChatHistory.bind(chatController));

// Asynchronous chat endpoints
router.post('/message-async', chatController.sendMessageAsync.bind(chatController));
router.post('/upload-material-async', upload.single('file'), chatController.uploadMaterialAsync.bind(chatController));

// Function calling endpoints
router.post('/function-call', chatController.executeFunction.bind(chatController));
router.post('/function-call-async', chatController.executeFunctionAsync.bind(chatController));
router.post('/parse-intent', chatController.parseIntent.bind(chatController));
router.get('/available-functions', chatController.getAvailableFunctions.bind(chatController));

// Additional utility endpoints
router.delete('/history', chatController.clearChatHistory.bind(chatController));
router.get('/search', chatController.searchMessages.bind(chatController));

export default router;
