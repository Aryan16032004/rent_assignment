import fs from 'node:fs';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../src/config/env.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true
});

try {
  const r = await cloudinary.uploader.upload('scripts/test.jpg', { resource_type: 'image', folder: 'renthub/test' });
  console.log(r.secure_url);
} catch (e) {
  console.dir(e, { depth: 6 });
}
