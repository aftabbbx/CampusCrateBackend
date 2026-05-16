const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resource.controller');
const authenticate = require('../middlewares/auth.middleware');
const { upload } = require('../config/cloudinary');

// ─── Public ─────────────────────────────────────────────────────────
router.get('/all', resourceController.getAllResources);
router.get('/search', resourceController.searchResources);
router.get('/:id', resourceController.getResourceById);

// ─── Protected (JWT required) ───────────────────────────────────────
router.post('/upload', authenticate, (req, res) => {
    upload.single('image')(req, res, function (err) {
        if (err) {
            console.error('Multer/Cloudinary Error:', err);
            return res.status(500).json({ success: false, message: 'Image upload failed: ' + err.message, error: err });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        return res.status(200).json({ success: true, image_url: req.file.path });
    });
});
router.post('/create', authenticate, resourceController.createResource);
router.get('/user/my', authenticate, resourceController.getMyResources);
router.put('/update/:id', authenticate, resourceController.updateResource);
router.delete('/delete/:id', authenticate, resourceController.deleteResource);

module.exports = router;
