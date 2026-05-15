const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authenticate = require('../middlewares/auth.middleware');

// ─── Public ─────────────────────────────────────────────────────────
router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.post('/verify', userController.verifyOtp);
router.post('/resend-otp', userController.resendOtp);

// ─── Protected (JWT required) ───────────────────────────────────────
router.get('/all', authenticate, userController.getAllUsers);
router.get('/profile', authenticate, userController.getProfile);
router.put('/update/:id', authenticate, userController.updateProfile);
router.put('/change-password', authenticate, userController.changePassword);
router.delete('/delete/:id', authenticate, userController.deleteAccount);

module.exports = router;
