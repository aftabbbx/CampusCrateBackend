const { cloudinary } = require('../config/cloudinary');

// ─── UPLOAD IMAGE (base64) ──────────────────────────────────────────
const uploadImage = async (req, res) => {
    try {
        const { base64 } = req.body;

        if (!base64) {
            return res.status(400).json({ success: false, message: 'base64 image data is required' });
        }

        const result = await cloudinary.uploader.upload(base64, {
            folder: 'campuscrate/chat-images',
            resource_type: 'image',
            transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
        });

        return res.status(200).json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
        });
    } catch (error) {
        console.error('Upload image error:', error);
        return res.status(500).json({ success: false, message: 'Image upload failed' });
    }
};

// ─── UPLOAD AUDIO (base64) ──────────────────────────────────────────
const uploadAudio = async (req, res) => {
    try {
        const { base64 } = req.body;

        if (!base64) {
            return res.status(400).json({ success: false, message: 'base64 audio data is required' });
        }

        const result = await cloudinary.uploader.upload(base64, {
            folder: 'campuscrate/voice-notes',
            resource_type: 'video', // Cloudinary uses 'video' for audio files
        });

        return res.status(200).json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
        });
    } catch (error) {
        console.error('Upload audio error:', error);
        return res.status(500).json({ success: false, message: 'Audio upload failed' });
    }
};

module.exports = { uploadImage, uploadAudio };
