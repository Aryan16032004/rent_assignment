import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  deleteMedia,
  isCloudinaryConfigured,
  mediaTypeFromMime,
  uploadBuffer
} from '../services/cloudinary.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';
import { env } from '../config/env.js';
import { validateBody } from '../middleware/validate.js';

export const uploadsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    if (!mediaTypeFromMime(file.mimetype)) {
      cb(new HttpError(400, 'Only image and video files are supported.'));
      return;
    }
    cb(null, true);
  }
});

uploadsRouter.get('/status', (_req, res) => {
  res.json({ configured: isCloudinaryConfigured(), folder: env.CLOUDINARY_UPLOAD_FOLDER });
});

uploadsRouter.post(
  '/',
  requireAuth,
  requireRole('landlord', 'both'),
  upload.array('files', 6),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      throw new HttpError(400, 'No files were uploaded.');
    }

    const media = [];
    for (const file of files) {
      const mediaType = mediaTypeFromMime(file.mimetype);
      if (!mediaType) {
        throw new HttpError(400, `Unsupported file type: ${file.mimetype}`);
      }
      media.push(await uploadBuffer(file.buffer, mediaType));
    }

    res.status(201).json({ media });
  })
);

const deleteSchema = z.object({
  publicId: z.string().min(1),
  mediaType: z.enum(['image', 'video']).default('image')
});

uploadsRouter.delete(
  '/',
  requireAuth,
  requireRole('landlord', 'both'),
  validateBody(deleteSchema),
  asyncHandler(async (req, res) => {
    const { publicId, mediaType } = req.body as z.infer<typeof deleteSchema>;
    if (!publicId.startsWith(env.CLOUDINARY_UPLOAD_FOLDER)) {
      throw new HttpError(403, 'You can only delete assets uploaded by RentHub.');
    }
    await deleteMedia(publicId, mediaType);
    res.json({ message: 'Media deleted.' });
  })
);
