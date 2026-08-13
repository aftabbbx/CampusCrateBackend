const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Resource images — max 1000x1000, auto WebP conversion
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'campuscrate/resources',
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' },
      { fetch_format: 'auto', quality: 'auto' },
    ],
  },
});

// Profile images — 400x400 face-crop, auto WebP conversion
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'campuscrate/profiles',
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { fetch_format: 'auto', quality: 'auto' },
    ],
  },
});

const upload = multer({ storage: storage });
const uploadProfile = multer({ storage: profileStorage });

module.exports = { cloudinary, upload, uploadProfile };
