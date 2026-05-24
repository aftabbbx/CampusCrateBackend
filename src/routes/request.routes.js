const express = require('express');
const router = express.Router();
const requestController = require('../controllers/request.controller');
const authenticate = require('../middlewares/auth.middleware');
const requireProfileComplete = require('../middlewares/profileComplete.middleware');

// ─── All Protected (JWT required) ───────────────────────────────────
router.post('/send', authenticate, requireProfileComplete, requestController.sendRequest);
router.get('/received', authenticate, requestController.getReceivedRequests);
router.get('/sent', authenticate, requestController.getSentRequests);
router.put('/:id/accept', authenticate, requestController.acceptRequest);
router.put('/:id/reject', authenticate, requestController.rejectRequest);
router.put('/:id/complete', authenticate, requestController.completeRequest);

module.exports = router;
