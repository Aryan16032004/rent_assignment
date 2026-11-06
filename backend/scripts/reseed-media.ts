import { pool } from '../src/db/pool.js';
import {
  deleteMedia,
  uploadRemote,
  type MediaType,
  type UploadedMedia
} from '../src/services/cloudinary.service.js';

const photoSets: readonly (readonly string[])[] = [
  // 0: Apartment, Bengaluru (Skyline Residency)
  ['1502672260266-1c1ef2d93688', '1560448204-e02f11c3d0e2', '1512917774080-9991f1c4c750'],
  // 1: Building, Mumbai (Emerald Heights)
  ['1545324418-cc1a3fa10c00', '1577495508048-b635879837f1', '1486406146926-c627a92ad1ab'],
  // 2: Independent House, Pune (Palm Grove Villas)
  ['1580587771525-78b9dba3b914', '1513694203232-719a280e022f', '1600585154340-be6161a56a0c'],
  // 3: Room, Hyderabad (Maple Co-Living)
  ['1595526114035-0d45ed16cfbf', '1505693416388-ac5ce068fe85', '1586023492125-27b2c045efd7'],
  // 4: Apartment, Delhi (Lakeview Towers)
  ['1493809842364-78817add7ffb', '1522708323590-d24dbb6b0267', '1556911220-e15b29be8c8f'],
  // 5: Apartment, Noida (Coral Suites)
  ['1560185007-c5ca9d2c014d', '1484154218962-a197022b5858', '1507089947368-19c1da9775ae'],
  // 6: Building, Ahmedabad (Riverfront Habitat)
  ['1460317442991-0ec209397118', '1515263487990-61b07816b324', '1574362848149-11496d93a7c7'],
  // 7: Independent House, Chennai (Sunrise Residency)
  ['1564013799919-ab600027ffc6', '1576941089067-2de3c901e126', '1618221195710-dd6b41faaea6'],
  // 8: Room, Kolkata (Metro Nest)
  ['1522771739844-6a9f6d5f14af', '1505691938895-1758d7feb511', '1598928506311-c55ded91a20c'],
  // 9: Apartment, Gurugram (The Northstar)
  ['1512918728675-ed5a9ecdebfd', '1600607687939-ce8a6c25118c', '1600566753190-17f0baa2a6c3'],
  // 10: Apartment, Jaipur (Orchid Bloom)
  ['1616486338812-3dadae4b4ace', '1554995207-c18c203602cb', '1616594039964-ae9021a400a0'],
  // 11: Independent House, Lucknow (Green Meadow)
  ['1598228723793-52759bba239c', '1570129477492-45c003edd2be', '1615874959474-d609969a20ed'],
  // 12: Building, Indore (Cityline Elite)
  ['1503387762-592deb58ef4e', '1512915922686-57c11dde9b6b', '1600585154526-990dced4db0d'],
  // 13: Room, Kochi (Urban Stays)
  ['1560185127-6ed189bf02f4', '1519710164239-da123dc03ef4', '1520250497591-112f2f40a3f4'],
  // 14: Apartment, Visakhapatnam (Harbor Point)
  ['1567767292278-a4f21aa2d36e', '1600607687920-4e2a09cf159d', '1600566753086-00f18fb6b3ea']
];

const seedVideos: Record<number, string> = {
  0: 'https://videos.pexels.com/video-files/17170688/17170688-hd_1920_1080_60fps.mp4',
  4: 'https://videos.pexels.com/video-files/7578546/7578546-hd_1920_1080_30fps.mp4'
};

function unsplashUrl(id: string): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;
}

async function upload(url: string, mediaType: MediaType): Promise<UploadedMedia> {
  const uploaded = await uploadRemote(url, mediaType);
  console.log(`uploaded ${mediaType}: ${uploaded.secure_url}`);
  return uploaded;
}

const listings = await pool.query<{ id: string }>(
  'SELECT id FROM listings ORDER BY created_at DESC'
);

console.log(`Found ${listings.rows.length} listings`);
let count = 0;

for (let index = 0; index < listings.rows.length; index += 1) {
  const listingId = listings.rows[index].id;
  const pair = photoSets[index % photoSets.length];
  if (!pair) continue;

  const media: UploadedMedia[] = [];
  for (const photoId of pair) {
    media.push(await upload(unsplashUrl(photoId), 'image'));
  }

  const video = seedVideos[index];
  if (video) {
    media.push(await upload(video, 'video'));
  }

  const existing = await pool.query<{ public_id: string | null; media_type: MediaType }>(
    'SELECT public_id, media_type FROM listing_images WHERE listing_id = $1',
    [listingId]
  );
  for (const asset of existing.rows) {
    if (asset.public_id) {
      await deleteMedia(asset.public_id, asset.media_type);
    }
  }

  await pool.query('DELETE FROM listing_images WHERE listing_id = $1', [listingId]);
  for (let mediaIndex = 0; mediaIndex < media.length; mediaIndex += 1) {
    const item = media[mediaIndex];
    await pool.query(
      `INSERT INTO listing_images
        (listing_id, url, public_id, media_type, thumbnail_url, width, height, duration, is_cover, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        listingId,
        item.url,
        item.publicId,
        item.mediaType,
        item.thumbnailUrl,
        item.width,
        item.height,
        item.duration,
        mediaIndex === 0,
        mediaIndex
      ]
    );
  }
  count += 1;
  console.log(`Updated listing ${listingId} with ${media.length} media`);
}

console.log(`Reseeded media for ${count} listings`);
await pool.end();
