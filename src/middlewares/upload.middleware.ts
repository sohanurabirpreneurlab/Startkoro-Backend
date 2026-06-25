import multer from 'multer';
import path from 'path';
import { AppError } from '../utils/AppError';

const allowedExtensions = new Set(['.xlsx', '.xls', '.csv']);

export const upload = multer({
  // MVP keeps the source spreadsheet only in memory so we can parse it immediately and discard it.
  // That avoids local disk writes and avoids introducing external file storage before we need it.
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(extension)) {
      callback(new AppError('Unsupported file type. Please upload a .xlsx, .xls, or .csv file.', 400));
      return;
    }

    callback(null, true);
  }
});
