# RentHub - Apartment Rental Web App

RentHub is a modern, responsive apartment rental web application built with the latest **Angular** (standalone components, signals, reactive forms, Angular Material, and typed routing). It connects property seekers with landlords through rich listing management, interactive filters, inquiry workflows, and a community Q&A comments system.

- **GitHub Repository:** [https://github.com/Aryan16032004/rent_assignment](https://github.com/Aryan16032004/rent_assignment)
- **Live Deployed App:** [https://renthub-demo.vercel.app](https://renthub-demo.vercel.app)

---

## Demo Credentials

For quick evaluation, pre-seeded accounts are provided with preloaded listings and inquiries:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Landlord** | `landlord@renthub.com` | `Landlord@123` | Post/Edit/Delete listings, reply to inquiries, answer comments (marked with **Owner** badge) |
| **Renter** | `renter@renthub.com` | `Renter@123` | Browse, filter, save favourites, submit inquiries, post questions/comments |
| **Both** | `host@renthub.com` | `Host@123` | Full access: dual permissions for listing properties and renting |

---

## Bonus Features Attempted

1. **Preview & Submit Flow:** A dedicated review screen displaying organized cards for Property Type, Number of Beds, Address, Rent, Description, 12 Amenities, and Photos Gallery with cover badge. Allows 1-click "Back to Edit" preserving all state, and draft persistence surviving page reloads.
2. **URL-Synced Search & Multi-Facet Filters:** Real-time search query parameters synchronized with the browser URL. Includes location, price range, bedrooms, lease type (Long term / Short term / Both), furnished status, vegetarian preference, and 12 amenities checkboxes.
3. **Interactive Comments & Reply System:** Nested 1-level replies on every listing with an **Owner** badge distinguishing landlords, character limits (1–500 non-whitespace characters), visitor prompts ("Login to comment"), and owner deletion with confirmation.
4. **Landlord Inquiry System:** Authenticated renters can directly message property owners with a modal composer; landlords can track received inquiries in their dashboard.
5. **Client-Side Image Compression & Downscaling:** Uploaded property photos are dynamically downscaled and compressed via an HTML5 canvas pipeline prior to storage, safeguarding against storage quota limits.
6. **Dark / Light Theme Mode:** Seamless theme switching with persistent storage across sessions.
7. **Profile & Security Center:** Interactive profile editing (name, phone) and password change dialog with strict strength validation (min 8 chars, uppercase, number, symbol) and mismatch checks.
8. **Indian Rupee (₹) Currency Standard:** Consistent formatting across listing cards, detail pages, filters, and forms.

---

## Tech Stack & Architecture

- **Framework:** Angular 19+ (Standalone Components, Signals, `toSignal`, `computed`, Reactive Forms)
- **CSS & UI Component Library:** **Angular Material** (`@angular/material`), Material Icons, CDK, Poppins typography
- **State & Storage Management:** In-memory reactive signals backed by `StorageService` with error handling and quota protection
- **Routing & Guards:** Typed lazy routes with `authGuard`, `guestGuard`, `landlordGuard`, `ownerGuard`, `listingDraftGuard`, and `unsavedChangesGuard`
- **Unit & Journey Testing:** Vitest, `@angular/router/testing` (`RouterTestingHarness`), `@angular/common/http/testing`

> **Note on Module Testing Deliverable:** RentHub is built using Angular standalone components (the modern official architectural standard). Per the assignment guidelines, the "module" testing requirement is fulfilled by **`src/app/app.routes.spec.ts`**, which comprehensively validates the entire routing table and all 6 navigation guards (`authGuard`, `guestGuard`, `landlordGuard`, `ownerGuard`, `listingDraftGuard`, `unsavedChangesGuard`).

---

## Getting Started

### 1. Prerequisites
- Node.js 20+ or 22+
- npm 10+

### 2. Installation
```bash
# Navigate to the renthub directory
cd renthub

# Install dependencies
npm install
```

### 3. Run Development Server
```bash
npm start
# Opens at http://localhost:4200
```

### 4. Run Automated Test Suite
```bash
npm test
```
Runs 60 automated unit and end-to-end journey tests covering:
- All 12 rubric user journeys (`app.flow.spec.ts`)
- Route configuration and security guards (`app.routes.spec.ts`)
- Core services (`auth.service.spec.ts`, `listing.service.spec.ts`)
- Component units (`login`, `register`, `listing-form`, `preview-submit`, `listing-details`, `listing-card`, `app`)

### 5. Production Build
```bash
npm run build
```
Generates an optimized production bundle inside `dist/renthub` with zero compilation errors and budget compliance.
