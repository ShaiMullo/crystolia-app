# System Audit

**Generated:** January 28, 2026  
**Purpose:** High-level review of system architecture and readiness for B2B expansion.

---

## 1. Tech Stack Overview

| Component | Version/Type |
|-----------|--------------|
| **Node.js** | `v22.18.0` |
| **Backend Framework** | NestJS `^11.0.1` |
| **Frontend Framework** | Next.js `16.0.5` |
| **React** | `19.2.0` |
| **TypeScript** | `^5.7.3` |
| **Database** | MongoDB (via Mongoose `^9.1.3`) |
| **Styling** | TailwindCSS `^4` |

---

## 2. Database Schemas

### User (`backend/src/users/entities/user.entity.ts`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | `string` | ✅ | Unique |
| `password` | `string` | ✅ | Hidden by default (`select: false`) |
| `role` | `enum` | ✅ | Values: `admin`, `secretary`, `customer` |
| `firstName` | `string` | ✅ | - |
| `lastName` | `string` | ✅ | - |
| `phone` | `string` | ❌ | Optional |
| `isActive` | `boolean` | ❌ | Default: `true` |
| `createdAt` | `Date` | Auto | Managed by Mongoose |
| `updatedAt` | `Date` | Auto | Managed by Mongoose |

### Lead (`backend/src/leads/entities/lead.entity.ts`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | `string` | ✅ | - |
| `phone` | `string` | ✅ | - |
| `email` | `string` | ❌ | Optional |
| `company` | `string` | ❌ | Optional |
| `message` | `string` | ❌ | Optional |
| `status` | `enum` | ❌ | Values: `New`, `Handled`, `Not Relevant` (Default: `New`) |
| `notes` | `string` | ❌ | CRM field for internal notes |
| `createdAt` | `Date` | Auto | Managed by Mongoose |
| `updatedAt` | `Date` | Auto | Managed by Mongoose |

---

## 3. Page Inventory

### Frontend Routes (`frontend/app/[locale]/`)

| Route | Status | Description |
|-------|--------|-------------|
| `/` | Fully Functional | Landing page |
| `/admin` | UI Only | Admin home, renders basic dashboard |
| `/admin/dashboard` | **Fully Functional** | Leads CRM with filters, status, notes, Excel export |
| `/admin/leads` | Unknown | Exists as directory |
| `/auth` | UI Only | Login page |
| `/auth/callback` | Functional | OAuth callback handler |
| `/contact` | Functional | Contact form (submits to Leads API) |
| `/dashboard` | Unknown | Customer dashboard placeholder |
| `/onboarding` | Unknown | Onboarding flow placeholder |
| `/orders` | Empty/Placeholder | No `page.tsx`, only dynamic `[id]` route exists |
| `/orders/[id]` | Unknown | Order details page |
| `/secretary` | Unknown | Secretary dashboard placeholder |
| `/test-flow` | Debug Only | Test page for development |

---

## 4. Service Status

### SMS Service (`smsService.ts`)
- **Provider:** AWS SNS (`@aws-sdk/client-sns`)
- **Status:** ✅ Operational
- **Configuration:**
  - Region: `us-east-1`
  - SenderID: `Crystolia`
  - SMSType: `Transactional`
- **Functions:** `sendSMS()`, `sendWelcomeSMS()`

### Secrets Manager
- **Status:** ❌ Not Integrated
- **Notes:** No `SecretsManagerClient` found. Secrets are stored in `.env` files or Kubernetes secrets.

### Excel Export
- **Status:** ✅ Operational
- **Library:** `exceljs` + `file-saver`
- **Features:**
  - Professional header styling (Blue #1F4E78, white bold text)
  - Conditional formatting (Green/Red/Yellow by status)
  - Auto-width columns
  - Thin borders

### WhatsApp Service
- **Status:** ⚠️ Exists but not actively used
- **File:** `whatsappService.ts`
- **Notes:** Template messages implemented, but leads currently trigger SMS only.

### Payment Service
- **Status:** ⚠️ Scaffolded
- **Files:** `PaymentService.ts`, `HypProvider.ts`
- **Notes:** Integration with Hyp payment gateway exists but requires validation.

---

## 5. Authentication Flow

### Current Implementation
- **Method:** JWT (JSON Web Token)
- **Library:** `@nestjs/passport` + `passport-jwt`
- **Guard:** `JwtAuthGuard` (extends `AuthGuard('jwt')`)

### Flow
1. User submits credentials to `/api/auth/login`
2. Backend validates and returns JWT token
3. Frontend stores token (localStorage/context)
4. Protected routes check `Authorization: Bearer <token>` header

### Status
- **Active:** ✅ JWT validation is enabled on protected routes.
- **Admin routes:** Use `@UseGuards(JwtAuthGuard)` decorator.
- **Bypass:** None detected. Some routes (e.g., public contact form) are intentionally unprotected.

---

## 6. B2B Readiness Gap

### Missing Components for Order Flow

| Component | Status | Gap Description |
|-----------|--------|-----------------|
| **Product Catalog** | ❌ Missing | No `Product` schema. Product types are hardcoded in `orders.service.ts`. |
| **Dynamic Pricing** | ❌ Missing | Prices are hardcoded. Not linked to `Customer.pricingTier`. |
| **Admin Orders UI** | ❌ Missing | No frontend for managing orders. |
| **Admin Invoices UI** | ❌ Missing | No frontend for viewing/managing invoices. |
| **Admin Customers UI** | ❌ Missing | No frontend for customer management. |
| **Customer Portal** | ❌ Missing | No self-service order placement for B2B customers. |
| **Payment Integration** | ⚠️ Unverified | `PaymentService.ts` exists but gateway connection is not validated. |
| **Order Notifications** | ❌ Missing | No SMS/Email triggers on order status changes. |
| **Order Delete Endpoint** | ❌ Missing | Only `POST`, `GET`, `PATCH` exist in `OrdersController`. |

### Required Actions for B2B Launch
1. Create `Product` schema with name, description, price, unit, image, category.
2. Implement dynamic pricing engine linked to customer tiers.
3. Build Admin dashboard pages for Orders, Invoices, Customers.
4. Build Customer self-service portal for order placement.
5. Validate and test payment gateway integration.
6. Add order lifecycle notifications (SMS/WhatsApp).
7. Migrate secrets to AWS Secrets Manager (optional but recommended).

---

## End of Audit
