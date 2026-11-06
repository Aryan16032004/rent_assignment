# RentHub - Full-Stack Apartment Rental Web Application

RentHub is a modern, full-stack apartment rental marketplace built with the latest **Angular** (standalone components, signals, reactive forms, Angular Material) and a high-performance **Node.js/Express** TypeScript backend powered by **Neon PostgreSQL** and **Cloudinary** media storage.

- **Frontend App (Vercel):** [https://renthub-frontend-lemon.vercel.app](https://renthub-frontend-lemon.vercel.app)
- **Backend API (Vercel):** [https://renthub-backend-kappa.vercel.app/api](https://renthub-backend-kappa.vercel.app/api)
- **Backend Health Check:** [https://renthub-backend-kappa.vercel.app/api/health](https://renthub-backend-kappa.vercel.app/api/health)
- **GitHub Repository:** [https://github.com/Aryan16032004/rent_assignment](https://github.com/Aryan16032004/rent_assignment)

---

## Demo Credentials

Pre-seeded accounts with listings, inquiries, and favourites are ready for evaluation:

| Role | Email | Password | Permissions & Capabilities |
| :--- | :--- | :--- | :--- |
| **Landlord** | `landlord@renthub.com` | `Landlord@123` | Post, edit, delete listings; view inquiries; answer comments (Owner badge) |
| **Renter** | `renter@renthub.com` | `Renter@123` | Browse, filter, save favourites, send inquiries, comment on listings |
| **Both** | `host@renthub.com` | `Host@123` | Full access: dual permissions for listing properties and renting |

---

## Features & Assignment Scope

1. **Authentication & Authorization:** Register/login with role selection (`renter`, `landlord`, `both`), JWT access tokens, bcrypt password hashing, persistent session restore, and role-based route guards.
2. **Post & Manage Apartments:** Comprehensive listing form with multi-section validations:
   - Property type (`Apartment`, `Building`, `Independent House`, `Room`) + Building name
   - Shared property indicator (`Yes` / `No`)
   - Full street address with city, state, zip code
   - Square feet + Lease type (`Long-term 6+ mos`, `Short-term`, `Both`)
   - Expected rent in INR (₹) + Negotiable toggle + Price mode (`Per month`, `Utilities included`)
   - Furnished status (`Yes` / `No`)
   - Vegetarian preference radios
   - 12 amenity checkboxes (Gym, Pool, Parking, Power Backup, Elevator, etc.)
   - Title and description validation
   - Image upload pipeline with live preview, cover selection, and deletion
3. **Bonus - Preview & Submit Screen:** Dedicated review screen presenting structured cards for Property Type, Number of Beds, Address, Rent, Description, Amenities, and Photo Gallery before publishing.
4. **Search, Faceted Filters & Sorting:** Real-time search query parameters synchronized with the browser URL. Includes location, price range, bedrooms, lease type, furnished status, vegetarian preference, and amenities checkboxes.
5. **Home Screen Hero & Featured Carousel:** Responsive featured listings carousel paired with a side spotlight card with 1-click Details and Favourites toggling.
6. **Community Comments & Q&A:** Commenting on every listing with special **Owner** badge distinguishing landlords, and deletion for owners.
7. **Landlord Inquiry System:** Authenticated renters can directly message property owners; landlords track inquiries in their dashboard.
8. **Owner Dashboard:** Overview of active/draft listings, received inquiries, and favourites.
9. **Responsive Design:** Optimized layouts for phones, tablets, and laptops (uncluttered desktop navbar with user dropdown, responsive carousel, and side-by-side action buttons on mobile).
10. **Dark / Light Theme:** Persistent theme toggle across sessions.

---

## Tech Stack & Architecture

- **Frontend:** Angular 19+ (Standalone Components, Signals, `computed`, Reactive Forms, Angular Material)
- **Backend:** Node.js, Express 5, TypeScript, Zod request validation, Helmet, CORS
- **Database:** Neon Serverless PostgreSQL (connection pooling, parameterized queries)
- **Media Storage:** Cloudinary CDN for property photos
- **Testing:** Vitest, `@angular/router/testing` (`RouterTestingHarness`), `@angular/common/http/testing`

> **Note on Module Testing:** Per assignment guidelines for modern standalone Angular applications, module testing is fulfilled by **`src/app/app.routes.spec.ts`**, which comprehensively validates the entire routing table and all 6 navigation guards (`authGuard`, `guestGuard`, `landlordGuard`, `ownerGuard`, `listingDraftGuard`, `unsavedChangesGuard`).

---

## Environment Variables

### Backend (`renthub-backend` on Vercel)

| Variable | Value / Description |
| :--- | :--- |
| `DATABASE_URL` | Neon PostgreSQL pooled connection string |
| `JWT_SECRET` | Secret key used to sign and verify JWT authentication tokens |
| `JWT_EXPIRES_IN` | Token duration (e.g., `7d`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CLOUDINARY_UPLOAD_FOLDER` | Upload folder (e.g., `renthub`) |

---

## Local Development Setup

### 1. Backend Setup
```bash
cd backend
npm install
npm run build
npm test
npm run dev
# Starts at http://localhost:3000
```

### 2. Frontend Setup
```bash
cd renthub
npm install
npm run build
npm test
npm start
# Opens at http://localhost:4200
```


