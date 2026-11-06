import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import { env } from '../src/config/env.js';

const cloudName = env.CLOUDINARY_CLOUD_NAME!;
const apiKey = env.CLOUDINARY_API_KEY!;
const apiSecret = env.CLOUDINARY_API_SECRET!;

const file = fs.readFileSync('scripts/test.jpg');
const timestamp = Math.floor(Date.now() / 1000);
const folder = 'renthub/test';

const params: Record<string, string> = {
  folder,
  timestamp: String(timestamp),
  upload_preset: ''
};

const toSign = `${folder}upload_preset=${params.upload_preset}${timestamp}${apiSecret}`;
const signature = crypto.createHash('sha1').update(toSign).digest('hex');

const boundary = `----renthub${crypto.randomUUID()}`;
const parts: Array<Buffer | string> = [];
const add = (s: string) => parts.push(s);
add(`--${boundary}\r\n`);
add('Content-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n');
parts.push(file);
add(`\r\n--${boundary}\r\n`);
add(`Content-Disposition: form-data; name="api_key"\r\n\r\n${apiKey}\r\n`);
add(`--${boundary}\r\n`);
add(`Content-Disposition: form-data; name="timestamp"\r\n\r\n${timestamp}\r\n`);
add(`--${boundary}\r\n`);
add(`Content-Disposition: form-data; name="folder"\r\n\r\n${folder}\r\n`);
add(`--${boundary}\r\n`);
add(`Content-Disposition: form-data; name="signature"\r\n\r\n${signature}\r\n`);
add(`--${boundary}--\r\n`);
const body = Buffer.concat(parts.map((p) => (Buffer.isBuffer(p) ? p : Buffer.from(p))));

const doRequest = (path: string) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = https.request(
      {
        method: 'POST',
        hostname: 'api.cloudinary.com',
        path,
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

const result = await doRequest(`/v1_1/${cloudName}/image/upload`);
console.log('status:', result.status);
console.log('body:', result.body);
