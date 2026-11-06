import fs from 'node:fs';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../src/config/env.js';
import { uploadBuffer } from '../src/services/cloudinary.service.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true
});

console.log('cloud_name:', env.CLOUDINARY_CLOUD_NAME);
console.log('api_key length:', env.CLOUDINARY_API_KEY?.length);

try {
  const ping = await cloudinary.api.ping();
  console.log('ping:', ping);
} catch (error) {
  console.error('ping failed', error);
}

try {
  const uploaded = await uploadBuffer(fs.readFileSync('scripts/test.jpg'), 'image');
  console.log('uploaded:', uploaded.url);
} catch (error) {
  console.error('upload failed', error);
}
