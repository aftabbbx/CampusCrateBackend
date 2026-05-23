const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth.middleware');
const { uploadImage, uploadAudio } = require('../controllers/upload.controller');

router.post('/image', authenticate, uploadImage);
router.post('/audio', authenticate, uploadAudio);

module.exports = router;
