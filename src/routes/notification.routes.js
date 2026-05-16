const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authenticate = require('../middlewares/auth.middleware');

// ─── All Protected (JWT required) ───────────────────────────────────
router.get('/all', authenticate, notificationController.getNotifications);
router.get('/unread-count', authenticate, notificationController.getUnreadCount);
router.put('/:id/read', authenticate, notificationController.markAsRead);
router.put('/read-all', authenticate, notificationController.markAllRead);

module.exports = router;
