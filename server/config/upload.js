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

// Files that must never be accepted as uploads: they would either leak data when served
// (database dumps, env files, keys, archives) or could be executed (scripts, binaries).
const BLOCKED_UPLOAD_EXT = /\.(sql|sqlite|db|bak|dump|env|pem|key|p12|pfx|zip|tar|gz|7z|rar|js|mjs|cjs|sh|bat|cmd|ps1|php|py|exe|dll|msi|html?|svgz)$/i;

const uploadFileFilter = (req, file, cb) => {
  const name = String(file.originalname || '');
  if (!name || name.startsWith('.') || BLOCKED_UPLOAD_EXT.test(name)) {
    const err = new Error(`File type not allowed: ${name || 'unnamed file'}`);
    err.code = 'UPLOAD_TYPE_NOT_ALLOWED';
    return cb(err);
  }
  cb(null, true);
};

// Strip any directory part and unsafe characters, so an uploaded name like
// "../../server.js" cannot write outside UPLOAD_DIR.
const safeUploadName = (originalname) => {
  const base = path.basename(String(originalname || 'file'));
  const cleaned = base.replace(/[^\w.\- ()]+/g, '_').replace(/^\.+/, '').slice(0, 150);
  return cleaned || 'file';
};

const UPLOAD_LIMITS = { fileSize: 25 * 1024 * 1024 }; // 25 MB

module.exports = {
  UPLOAD_DIR,
  uploadFileFilter,
  safeUploadName,
  UPLOAD_LIMITS
};
