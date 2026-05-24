const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const authenticate = require('../middlewares/auth.middleware');
const requireProfileComplete = require('../middlewares/profileComplete.middleware');

// ─── All Protected (JWT required) ───────────────────────────────────
router.post('/send', authenticate, requireProfileComplete, messageController.sendMessage);
router.get('/conversations', authenticate, messageController.getConversationList);
router.get('/:userId', authenticate, messageController.getConversation);
router.put('/read/:userId', authenticate, messageController.markAsRead);

module.exports = router;
