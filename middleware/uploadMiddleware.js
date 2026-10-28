const multer = require('multer');

const path = require('path');

const fs = require('fs');

const crypto = require('crypto');

const uploadDir = path.join(__dirname, '../public/uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {

    const ext = path.extname(file.originalname).toLowerCase();

    const uuidName = crypto.randomUUID();

    cb(null, `report-${uuidName}${ext}`);
  }
});

/**
 * Validates that uploaded file matches both authorized MIME types and file extensions.
 */
const fileFilter = (req, file, cb) => {

  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png'
  ];

  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {

    cb(new Error('Invalid file format. Only PDF, JPG, and PNG documents are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: fileFilter
});

module.exports = upload;
