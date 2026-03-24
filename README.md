# Green-link 🌿

**Green-link** is an enterprise-grade, full-stack Smart Waste Management System designed for municipal digital transformation. It replaces traditional manual logbooks with a robust, QR-verified digital workflow, empowering administrators with real-time analytics and providing residents with a seamless portal for tracking and payments.

---

## 🚀 Core Modules & Features

### 🔐 Multi-Role Access Control (RBAC)
- **Admin Command Center**: 
    - **Global Overview**: Real-time stats (Revenue, Coverage, Pending) filtered by a dynamic **Calendar**.
    - **Daily Assignments**: A strategic interface to allocate collectors from a pool to specific wards each day.
    - **Workforce Management**: Full CRUD operations for the Collector pool.
    - **Inventory Control**: Comprehensive management of the Household database.
    - **Live Mapping**: GPS-based visualization of collection progress across the panchayat.
- **Collector Field App**: 
    - **Daily Route Logic**: Collectors only see houses assigned to them by the Admin for the current date.
    - **Tile-based UI**: Optimized for mobile use with large, accessible touch targets.
    - **Route Alerts**: Instant notifications if another collector is already active in one of their primary wards.
- **Resident Self-Service Portal**: 
    - **Live Verification**: View current collection status with a 5-second real-time sync pulse.
    - **Household QR**: Unique identifier used for doorstep verification.
    - **Payment Gateway**: Simulated online payment flow for digital convenience.

### 📲 Smart Verification & Workflow
- **QR Strictness**: Collectors **must scan** the physical QR code at the doorstep to unlock the "Collected" action.
- **Misclick Protection**: Logic-locked scanning ensures that scanning "House B" while "House A" is active triggers a verification error.
- **Lazy Reset Logic**: A specialized API layer that automatically resets statuses to "Pending" for the UI every new day, ensuring the system is always ready for a fresh collection round without manual database intervention.

### 💰 Hybrid Financial Tracking
- **Cash (Offline)**: Allows collectors to log physical payments, instantly marking the resident as "Paid."
- **Digital (Online)**: Residents can pay via their portal, which removes the payment button and updates the Admin logs in real-time.
- **Unified Auditing**: The system prevents duplicate logs by intelligently updating visit records with payment data, ensuring a clean "one-event-per-line" audit trail.

### 📄 Professional Reporting
- **PDF Receipts**: Redesigned printable receipts optimized via `@media print` to look like official government invoices, complete with branding and verification shields.
- **CSV Exports**: One-click generation of transparency reports for auditing and compliance.

---

## 🛠 Technical Architecture

- **Frontend**: React 18 with TypeScript and Vite.
- **Styling**: Tailwind CSS & shadcn/ui utilizing a custom sliding **Light/Dark Mode** switch.
- **Backend-as-a-Service**: Appwrite (Authentication, NoSQL Database).
- **Data Synchronization**: TanStack Query (React Query) for efficient caching and auto-polling (5s - 10s intervals).
- **Hardware Integration**: `html5-qrcode` for high-speed camera-based scanning on mobile devices.

---

## 📂 Appwrite Database Schema

### 1. Households (`Households`)
- `residentName` (String): Full name of the resident.
- `address` (String): Doorstep location.
- `phone` (String): Unique identifier for resident login.
- `ward` (Integer): Ward number (1-8).
- `paymentStatus` (String): `paid`, `pending`, `overdue`.
- `collectionStatus` (String): `collected`, `pending`, `not-available`.
- `paymentMode` (String): `online`, `offline`, `none`.
- `assignedCollector` (String): Linked to the active collector for the day.
- `lat` / `lng` (Float): Coordinates for map plotting.

### 2. Collectors (`Collectors`)
- `name`, `phone`, `email`, `avatar`
- `ward` (Integer Array): Primary wards this collector is eligible to work in.
- `status` (String): `active`, `on-leave`.

### 3. CollectionLogs (`CollectionLogs`)
- `householdId`, `residentName`, `timestamp`, `location`.
- `status`: Collection result.
- `paymentMode`: Financial tracking.
- `amountCollected`: Fee verification.

### 4. Routes (`Routes`)
- `collectorId`, `ward`, `date`, `status` (`active`/`completed`).
- Tracks the Admin's daily deployment strategy.

---

## 🛠 Management & Setup Scripts

- **`node scripts/setup_appwrite.cjs`**: Automated schema generator. Creates all collections, required attributes, and handles attribute deprecation.
- **`node scripts/reset_and_seed.cjs`**: Resilient reset tool. Wipes existing data and seeds **60 households** and **12 collectors** with 10 days of historical logs. Includes network throttling and retry logic for high stability on Appwrite Cloud.
- **`node scripts/fix_assignments.cjs`**: Logic-check utility to re-sync household assignments based on ward-collector mapping.

---

## 🏁 Development Environment

1. **Local Network Access**:
   - The system is pre-configured to listen on `0.0.0.0:5173`.
   - Access on mobile via: `http://<your-pc-ip>:5173`.
2. **Secure Context (Scanning)**:
   - Modern browsers require **HTTPS** for camera access. For mobile testing, use an HTTPS tunnel (Ngrok/Localtunnel) or the built-in **"Simulated Scan (Dev)"** button.
3. **Firewall**:
   - Ensure port 5173 is open: `sudo ufw allow 5173/tcp`.

---

© 2026 **Green-link Digital Initiative** — Transforming waste management for a cleaner, smarter future.
