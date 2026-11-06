import bcrypt from 'bcryptjs';
import { pool, withTransaction } from './pool.js';
import { uploadRemote, type UploadedMedia } from '../services/cloudinary.service.js';

interface DemoUser {
  name: string;
  email: string;
  password: string;
  role: 'renter' | 'landlord' | 'both';
  phone: string;
}

const demoUsers: DemoUser[] = [
  {
    name: 'Rahul Verma',
    email: 'landlord@renthub.com',
    password: 'Landlord@123',
    role: 'landlord',
    phone: '+91-9876543210'
  },
  {
    name: 'Ananya Gupta',
    email: 'renter@renthub.com',
    password: 'Renter@123',
    role: 'renter',
    phone: '+91-9876543211'
  },
  {
    name: 'Amit Sharma',
    email: 'host@renthub.com',
    password: 'Host@123',
    role: 'both',
    phone: '+91-9876543212'
  }
];

const cityData = [
  ['Apartment', 'Skyline Residency', 'Bengaluru', 45000, 2],
  ['Building', 'Emerald Heights', 'Mumbai', 90000, 3],
  ['Independent House', 'Palm Grove Villas', 'Pune', 52000, 2],
  ['Room', 'Maple Co-Living', 'Hyderabad', 18000, 1],
  ['Apartment', 'Lakeview Towers', 'Delhi', 67000, 2],
  ['Apartment', 'Coral Suites', 'Noida', 32000, 1],
  ['Building', 'Riverfront Habitat', 'Ahmedabad', 58000, 2],
  ['Independent House', 'Sunrise Residency', 'Chennai', 61000, 3],
  ['Room', 'Metro Nest', 'Kolkata', 14000, 1],
  ['Apartment', 'The Northstar', 'Gurugram', 76000, 3],
  ['Apartment', 'Orchid Bloom', 'Jaipur', 26000, 1],
  ['Independent House', 'Green Meadow', 'Lucknow', 39000, 2],
  ['Building', 'Cityline Elite', 'Indore', 42000, 2],
  ['Room', 'Urban Stays', 'Kochi', 16000, 1],
  ['Apartment', 'Harbor Point', 'Visakhapatnam', 30000, 2]
] as const;

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

function getPropertyDescription(propertyType: string, buildingName: string, city: string): string {
  switch (propertyType) {
    case 'Independent House':
      return `Charming private villa in ${city} at ${buildingName}. Features landscaped lawn, sun-drenched living areas, modern fitted kitchen, private parking, and 24/7 security. Perfect for families looking for quiet luxury.`;
    case 'Building':
      return `Spacious residential floor in the landmark ${buildingName}, ${city}. Includes high-speed elevators, 24/7 concierge, covered parking, fitness center, and seamless connectivity to business hubs.`;
    case 'Room':
      return `Comfortable, fully furnished private room in ${city} at ${buildingName}. Designed for professionals and students, featuring high-speed WiFi, ergonomic workstation, housekeeping, and shared modern kitchen.`;
    case 'Apartment':
    default:
      return `Bright, modern apartment in ${city} located at ${buildingName}. Offers open-plan living, wooden laminate flooring, modular kitchen, private balcony with scenic views, and dedicated power backup.`;
  }
}

const seedVideos: Record<number, string> = {
  0: 'https://videos.pexels.com/video-files/17170688/17170688-hd_1920_1080_60fps.mp4',
  4: 'https://videos.pexels.com/video-files/7578546/7578546-hd_1920_1080_30fps.mp4'
};

function unsplashUrl(id: string): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;
}

async function uploadSeedMedia(
  url: string,
  mediaType: 'image' | 'video'
): Promise<UploadedMedia> {
  try {
    return await uploadRemote(url, mediaType);
  } catch (error) {
    console.warn(`Cloudinary seed upload failed for ${mediaType}, using remote URL`, error);
    return {
      url,
      publicId: '',
      mediaType,
      thumbnailUrl: null,
      width: null,
      height: null,
      duration: null
    };
  }
}

async function seed(): Promise<void> {
  const userIds = new Map<string, string>();

  for (const user of demoUsers) {
    const existing = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [user.email]
    );
    if (existing.rows[0]) {
      userIds.set(user.email, existing.rows[0].id);
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, 12);
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [user.name, user.email, passwordHash, user.role, user.phone]
    );
    userIds.set(user.email, inserted.rows[0].id);
  }

  const landlordId = userIds.get('landlord@renthub.com')!;
  const renterId = userIds.get('renter@renthub.com')!;
  const hostId = userIds.get('host@renthub.com')!;

  const force = process.argv.includes('--force');
  const listingCount = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM listings');
  if (force || Number(listingCount.rows[0]?.count ?? 0) === 0) {
    if (force) {
      console.log('Force re-seeding: clearing existing comments, inquiries, favourites, listings, and images...');
      await pool.query('DELETE FROM comments');
      await pool.query('DELETE FROM inquiry_messages');
      await pool.query('DELETE FROM inquiries');
      await pool.query('DELETE FROM favourites');
      await pool.query('DELETE FROM listing_images');
      await pool.query('DELETE FROM listings');
    }

    await withTransaction(async (client) => {
      const listingIds: string[] = [];

      for (let index = 0; index < cityData.length; index += 1) {
        const [propertyType, buildingName, city, rent, bedrooms] = cityData[index];
        const ownerId = index % 2 === 0 ? landlordId : hostId;
        const ownerName = index % 2 === 0 ? demoUsers[0].name : demoUsers[2].name;
        const createdAt = new Date(Date.now() - index * 86_400_000).toISOString();

        const listing = await client.query<{ id: string }>(
          `INSERT INTO listings (
            owner_id, property_type, building_name, is_shared, street, city, state, zip,
            square_feet, bedrooms, lease_type, expected_rent, negotiable, price_mode,
            furnished, vegetarian_only, amenities, title, description, status, featured,
            contact_name, contact_phone, contact_email, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'India', $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, 'published', $19, $20, $21, $22, $23, $23
          ) RETURNING id`,
          [
            ownerId,
            propertyType,
            buildingName,
            index % 3 === 0,
            `${index + 12} Residency Road`,
            city,
            `${560001 + index * 1000}`,
            550 + index * 80,
            bedrooms,
            index % 4 === 0 ? 'both' : index % 2 === 0 ? 'long-term' : 'short-term',
            rent,
            index % 2 === 0,
            index % 3 === 0 ? 'utilities-included' : 'per-month',
            index % 2 === 0,
            index % 3 === 0 ? 'yes' : index % 5 === 0 ? 'no-preference' : 'no',
            ['Gym/Fitness Center', 'Car Park', index % 2 === 0 ? 'Power Backup' : 'Swimming Pool', 'Elevator'],
            `${propertyType} in ${city} - ${buildingName}`,
            getPropertyDescription(propertyType, buildingName, city),
            index < 5,
            ownerName,
            '+91-9876543210',
            index % 2 === 0 ? 'landlord@renthub.com' : 'host@renthub.com',
            createdAt
          ]
        );

        const listingId = listing.rows[0].id;
        listingIds.push(listingId);

        const media: UploadedMedia[] = [];
        console.log(`[${index + 1}/${cityData.length}] Seeding ${propertyType} in ${city} (${buildingName})...`);
        for (const photoId of photoSets[index]) {
          const uploaded = await uploadSeedMedia(unsplashUrl(photoId), 'image');
          media.push(uploaded);
          console.log(`   Uploaded image: ${uploaded.url}`);
        }

        const videoUrl = seedVideos[index];
        if (videoUrl) {
          const uploaded = await uploadSeedMedia(videoUrl, 'video');
          media.push(uploaded);
          console.log(`   Uploaded video: ${uploaded.url}`);
        }

        for (let mediaIndex = 0; mediaIndex < media.length; mediaIndex += 1) {
          const item = media[mediaIndex];
          await client.query(
            `INSERT INTO listing_images
              (listing_id, url, public_id, media_type, thumbnail_url, width, height, duration, is_cover, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              listingId,
              item.url,
              item.publicId || null,
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
      }

      await client.query(
        `INSERT INTO comments (listing_id, author_id, content)
         VALUES ($1, $2, 'Is parking included in the rent?')`,
        [listingIds[0], renterId]
      );
      await client.query(
        `INSERT INTO comments (listing_id, author_id, content)
         VALUES ($1, $2, 'Yes, one covered parking slot is included.')`,
        [listingIds[0], landlordId]
      );
      await client.query(
        `INSERT INTO comments (listing_id, author_id, content)
         VALUES ($1, $2, 'Can I schedule a visit this weekend?')`,
        [listingIds[1], hostId]
      );

      await client.query(
        `INSERT INTO inquiries (listing_id, sender_id, receiver_id, message)
         VALUES ($1, $2, $3, 'Interested in a 12-month lease. Is move-in possible next month?')`,
        [listingIds[2], renterId, landlordId]
      );

      await client.query(
        `INSERT INTO favourites (user_id, listing_id)
         VALUES ($1, $2), ($1, $3), ($4, $5)
         ON CONFLICT DO NOTHING`,
        [renterId, listingIds[0], listingIds[4], hostId, listingIds[3]]
      );
    });
  }

  console.log('Seed complete.');
  console.log('Demo accounts:');
  console.log('  landlord@renthub.com / Landlord@123');
  console.log('  renter@renthub.com   / Renter@123');
  console.log('  host@renthub.com     / Host@123');
  await pool.end();
}

seed().catch(async (error) => {
  console.error('Seed failed', error);
  await pool.end();
  process.exit(1);
});
