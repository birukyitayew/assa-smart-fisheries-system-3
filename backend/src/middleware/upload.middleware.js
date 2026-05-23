const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Memory storage keeps files secure in memory instead of writing to disk
const storage = multer.memoryStorage();

const MIME_WHITELIST = ['image/jpeg', 'image/png', 'image/webp'];

function fileFilter(req, file, cb) {
  if (!MIME_WHITELIST.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP images are allowed.'), false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter,
});

/**
 * Helper to upload memory buffer to Cloudinary.
 * Parses process.env.CLOUDINARY_URL automatically under the hood.
 */
function uploadBufferToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_URL) {
      return reject(new Error('CLOUDINARY_URL environment variable is not defined.'));
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder: 'assa_catches' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

module.exports = {
  upload,
  uploadBufferToCloudinary,
};
