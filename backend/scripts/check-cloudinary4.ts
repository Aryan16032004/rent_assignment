import fs from 'node:fs';
import https from 'node:https';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../src/config/env.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true
});

const file = fs.readFileSync('scripts/test.jpg');
const timestamp = Math.floor(Date.now() / 1000);
const folder = 'renthub/test';
const paramsToSign: Record<string, unknown> = {
  folder,
  timestamp,
  use_filename: true,
  unique_filename: true,
  overwrite: false
};

const signature = cloudinary.utils.api_sign_request(
  paramsToSign,
  env.CLOUDINARY_API_SECRET!
);
console.log('signature:', signature);

const boundary = `----renthub${crypto.randomUUID()}`;
const enc = (disp: string, value: string | number) =>
  `--${boundary}\r\nContent-Disposition: form-data; name="${disp}"\r\n\r\n${value}\r\n`;

let body = Buffer.alloc(0);
body = Buffer.concat([body, Buffer.from(enc('api_key', env.CLOUDINARY_API_KEY!))]);
body = Buffer.concat([body, Buffer.from(enc('timestamp', timestamp))]);
body = Buffer.concat([body, Buffer.from(enc('folder', folder))]);
body = Buffer.concat([body, Buffer.from(enc('use_filename', 'true'))]);
body = Buffer.concat([body, Buffer.from(enc('unique_filename', 'true'))]);
body = Buffer.concat([body, Buffer.from(enc('overwrite', 'false'))]);
body = Buffer.concat([body, Buffer.from(enc('signature', signature))]);
body = Buffer.concat([
  body,
  Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
  ),
  file,
  Buffer.from(`\r\n--${boundary}--\r\n`)
]);

const result = await new Promise<{ status: number; body: string }>((resolve, reject) => {
  const req = https.request(
    {
      method: 'POST',
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
    }
  );
  req.on('error', reject);
  req.end(body);
});

console.log('status:', result.status);
console.log('body:', result.body);
