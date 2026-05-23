const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authenticate = require('../middlewares/auth.middleware');
const { cloudinary } = require('../config/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Profile image upload config (separate from resource images)
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'campuscrate/profiles',
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  },
});
const profileUpload = multer({ storage: profileStorage });

// ─── Public ─────────────────────────────────────────────────────────
router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.post('/verify', userController.verifyOtp);
router.post('/resend-otp', userController.resendOtp);
router.get('/public/:rollNumber', userController.getPublicProfile);

// ─── Protected (JWT required) ───────────────────────────────────────
router.get('/all', authenticate, userController.getAllUsers);
router.get('/profile', authenticate, userController.getProfile);
router.put('/update/:id', authenticate, userController.updateProfile);
router.post('/follow/:id', authenticate, userController.followUser);
router.post('/unfollow/:id', authenticate, userController.unfollowUser);
router.get('/followers/:id', userController.getFollowers);
router.get('/following/:id', userController.getFollowing);
router.put('/change-password', authenticate, userController.changePassword);
router.delete('/delete/:id', authenticate, userController.deleteAccount);

// ─── Profile Image Upload ───────────────────────────────────────────
router.post('/upload-profile-image', authenticate, (req, res) => {
  profileUpload.single('image')(req, res, async function (err) {
    if (err) {
      console.error('Profile image upload error:', err);
      return res.status(500).json({ success: false, message: 'Image upload failed: ' + err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    try {
      const User = require('../models/User');
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      user.profile_image = req.file.path;
      user.last_active = new Date();
      await user.save();
      return res.status(200).json({
        success: true,
        message: 'Profile image updated',
        profile_image: req.file.path,
      });
    } catch (error) {
      console.error('Save profile image error:', error);
      return res.status(500).json({ success: false, message: 'Failed to save profile image' });
    }
  });
});

module.exports = router;
