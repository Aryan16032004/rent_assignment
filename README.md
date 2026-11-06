# RentHub

RentHub is a full-stack apartment rental marketplace built for the Nagarro Angular assignment.

- **Frontend:** Angular 22, Angular Material, Signals, Reactive Forms, standalone components
- **Backend:** Node.js, Express 5, TypeScript, PostgreSQL
- **Auth:** JWT access tokens, bcrypt password hashing, role-based authorization
- **Data:** PostgreSQL via `pg`; local image uploads through Multer

## Features

- Register/login with role selection (`renter`, `landlord`, `both`), persistent sessions and automatic session restore
- Create, preview, publish, edit, delete and manage listings
- Listing statuses: draft, pending, published, rented, inactive
- Search and filters: text, city, rent range, bedrooms, property type, lease type, furnished, vegetarian preference, amenities
- Sorting and pagination
- Favourites with reactive heart state
- Inquiries with received/sent inbox, conversation replies and status management
- Listing questions/comments with replies
- Owner dashboard with listing, favourite and inquiry statistics
- Profile editing and password change
- Dark/light theme
- Responsive layouts and loading/empty states
- INR price formatting

## Repository layout

```
rent_assignment/
├── renthub/       Angular frontend
├── backend/       Express + PostgreSQL API
└── README.md
```

## Prerequisites

- Node.js 20.19+, 22.12+ or 24+ and npm (Angular 22 requirement)
- PostgreSQL 14+
- pgAdmin (or another PostgreSQL client)

> If you run commands from WSL and `node` is not available, run the npm commands from Windows PowerShell/CMD or add the Windows Node installation to the WSL `PATH`.

## 1. Create the database

Using pgAdmin:

1. Connect to your local PostgreSQL server.
2. Create a database named `renthub`.
3. Note the postgres username/password.

Or with `psql`:

```bash
createdb renthub
```

## 2. Configure and start the backend

```bash
cd backend
copy .env.example .env
```

Edit `backend/.env` and set `DATABASE_URL` to match your local PostgreSQL credentials, for example:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/renthub
JWT_SECRET=replace-with-a-long-random-secret
```

Install dependencies and set up the database:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The API runs at `http://localhost:3000`. Health check: `http://localhost:3000/api/health`.

## 3. Start the Angular frontend

```bash
cd renthub
npm install
npm start
```

Open `http://localhost:4200`.

The frontend API URL is configured in `renthub/src/app/core/config/api.config.ts`. It defaults to `http://localhost:3000/api`.

## Demo accounts

The seed script creates these accounts if they do not already exist:

| Role | Email | Password |
|---|---|---|
| Landlord | `landlord@renthub.com` | `Landlord@123` |
| Renter | `renter@renthub.com` | `Renter@123` |
| Both | `host@renthub.com` | `Host@123` |

Seeding is idempotent: existing users are preserved, and demo listings are only inserted when the listings table is empty.

## Database scripts

```bash
cd backend
npm run db:migrate   # apply schema
npm run db:seed      # add demo accounts and sample data
npm run db:reset     # drop tables, recreate schema
```

## Tests

Frontend:

```bash
cd renthub
npm test
npm run build
```

Backend:

```bash
cd backend
npm test
npm run build
```

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Users | `GET /api/users/check-email`, `PATCH /api/users/me`, `PATCH /api/users/me/password` |
| Listings | `GET /api/listings`, `GET /api/listings/featured`, `GET /api/listings/mine`, `GET /api/listings/:id`, `POST /api/listings`, `PATCH /api/listings/:id`, `PATCH /api/listings/:id/status`, `DELETE /api/listings/:id` |
| Images | `POST /api/listings/:id/images`, `DELETE /api/listings/:id/images/:imageId` |
| Favourites | `GET /api/favourites`, `POST/DELETE /api/listings/:id/favourite` |
| Inquiries | `POST /api/listings/:id/inquiries`, `GET /api/inquiries/received`, `GET /api/inquiries/sent`, `GET /api/inquiries/:id`, `POST /api/inquiries/:id/messages`, `PATCH /api/inquiries/:id/status` |
| Comments | `GET/POST /api/listings/:id/comments`, `DELETE /api/comments/:id` |
| Dashboard | `GET /api/dashboard` |

## Security notes

- Passwords are hashed with bcrypt on the server.
- JWT authorization is enforced by backend middleware; Angular guards are only a UX layer.
- Listing edits/deletes and inquiry status changes are owner/participant protected.
- Request bodies are validated with Zod.
- SQL uses parameterized queries.
- Do not commit `backend/.env` or any real secrets.

## Current scope / next steps

Implemented: Phase 1 + Phase 2 features listed above.

Deferred: email verification, password recovery, maps/location, notifications, listing reports, admin dashboard, Cloudinary/storage abstraction, end-to-end browser tests, and production deployment.

For production, move JWT storage to secure cookies or a hardened refresh-token flow, store images in object storage, and add rate limiting/monitoring.
