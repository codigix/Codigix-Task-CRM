const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Ensure .env is loaded
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const envUploadPath = process.env.UPLOAD_PATH;

if (!envUploadPath) {
  throw new Error('UPLOAD_PATH is not defined in .env! Please define UPLOAD_PATH in your .env file.');
}

// Resolve the upload directory strictly from the .env file
// If UPLOAD_PATH is absolute, use it directly.
// If relative (e.g. 'uploads' or './uploads'), resolve strictly relative to the server root.
const UPLOAD_DIR = path.isAbsolute(envUploadPath)
  ? path.normalize(envUploadPath)
  : path.resolve(__dirname, '..', envUploadPath);

// Ensure the directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

module.exports = {
  UPLOAD_DIR
};
