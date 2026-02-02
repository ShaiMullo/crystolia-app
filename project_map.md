# Project Structure Map

**Generated:** 2026-01-28
**Branch:** dev

## 1. Directory Structure

### Backend (`backend/src`)
```
backend/src
├── app.controller.spec.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
├── auth
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── dto
│   │   ├── create-auth.dto.ts
│   │   ├── login.dto.ts
│   │   └── update-auth.dto.ts
│   ├── entities
│   │   └── auth.entity.ts
│   ├── jwt-auth.guard.ts
│   └── jwt.strategy.ts
├── config
│   └── passport.ts
├── controllers
│   └── LeadsController.ts
├── customers
│   ├── customers.controller.ts
│   ├── customers.module.ts
│   ├── customers.service.ts
│   ├── dto
│   │   ├── create-customer.dto.ts
│   │   └── update-customer.dto.ts
│   └── entities
│   │   └── customer.entity.ts
├── index.ts
├── invoices
│   ├── dto
│   │   └── create-invoice.dto.ts
│   ├── invoices.controller.ts
│   ├── invoices.module.ts
│   ├── invoices.service.ts
│   ├── morning.service.ts  <-- KEY FILE (Morning API Integration)
│   └── schemas
│       └── invoice.schema.ts
├── leads
│   ├── dto
│   │   ├── create-lead.dto.ts
│   │   └── update-lead.dto.ts
│   ├── entities
│   │   └── lead.entity.ts <-- KEY FILE (Active Lead Schema)
│   ├── leads.controller.ts <-- KEY FILE (Active Lead Controller)
│   ├── leads.module.ts
│   └── leads.service.ts
├── main.ts
├── middleware
│   ├── authentication.ts
│   └── errorHandler.ts
├── models (LEGACY/DUPLICATES)
│   ├── Customer.ts
│   ├── Lead.ts
│   ├── Order.ts
│   ├── Payment.ts
│   └── User.ts
├── orders
│   ├── dto
│   │   ├── create-order.dto.ts
│   │   └── update-order.dto.ts
│   ├── entities
│   │   └── order.entity.ts
│   ├── orders.controller.ts
│   ├── orders.module.ts
│   ├── orders.service.ts <-- KEY FILE (Order Logic)
│   └── schemas
│       └── order.schema.ts <-- KEY FILE (Active Order Schema)
├── products
│   ├── dto
│   │   ├── create-product.dto.ts
│   │   └── update-product.dto.ts
│   ├── entities
│   │   └── product.entity.ts
│   ├── products.controller.ts
│   ├── products.module.ts
│   └── products.service.ts
├── routes (LEGACY)
│   ├── analytics.ts
│   ├── auth.ts
│   ├── customers.ts
│   ├── debug.ts
│   ├── leads.ts
│   ├── payments.ts
│   └── whatsapp.ts
├── scripts
│   ├── check-admin-user.ts
│   ├── create-admin-hashed.ts
│   ├── create-admin.ts
│   ├── reset-admin-password.ts
│   ├── seed-leads.ts
│   ├── seed.ts
│   └── update-admin-email.ts
├── services
│   ├── LeadsService.ts (LEGACY)
│   ├── NotificationsService.ts <-- KEY FILE (WhatsApp/SMS Logic)
│   ├── documentService.ts
│   ├── greenInvoice.ts
│   ├── payment
│   │   ├── HypProvider.ts
│   │   ├── PaymentService.ts
│   │   └── interfaces.ts
│   ├── smsService.ts
│   ├── ultramsgService.ts
│   └── whatsappService.ts
├── users
│   ├── dto
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   ├── entities
│   │   └── user.entity.ts
│   ├── users.controller.ts
│   ├── users.module.ts
│   └── users.service.ts
└── utils
    ├── jwtUtils.ts
    └── memory-db.ts
```

### Frontend (`frontend/app`)
```
frontend/app
├── [locale]
│   ├── admin
│   │   ├── dashboard
│   │   │   └── page.tsx <-- KEY FILE (Admin Dashboard UI)
│   │   ├── leads
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── auth
│   │   ├── callback
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── contact
│   │   └── page.tsx
│   ├── dashboard
│   │   └── page.tsx
│   ├── onboarding
│   │   └── page.tsx
│   ├── orders
│   │   └── [id]
│   │       └── pay
│   ├── page.tsx
│   ├── secretary
│   │   └── page.tsx
│   └── test-flow
│       └── page.tsx
├── api
│   └── send-lead
│       └── route.ts
├── auth
│   └── callback
│       └── page.tsx
├── components
│   ├── About.tsx
│   ├── AdminDashboard.tsx <-- KEY FILE (Admin Dashboard Component)
│   ├── AuthPage.tsx
│   ├── Contact.tsx
│   ├── CustomerDashboard.tsx
│   ├── Features.tsx
│   ├── Footer.tsx
│   ├── Header.tsx
│   ├── Hero.tsx
│   ├── LanguageSwitcher.tsx
│   ├── OnboardingPage.tsx
│   ├── Products.tsx
│   ├── SecretaryDashboard.tsx
│   ├── WhatsAppButton.tsx
│   ├── dashboardTranslations.ts
│   ├── globals.css
│   └── translations.ts
├── context
│   └── AuthContext.tsx
├── globals.css
├── layout.tsx
├── lib
│   └── api.ts
└── page.tsx
```

## 2. Key Files Location

| File | Location | Description |
|------|----------|-------------|
| **orders.service.ts** | `backend/src/orders/orders.service.ts` | Main business logic for orders. |
| **order.schema.ts** | `backend/src/orders/schemas/order.schema.ts` | Mongoose schema for Order. |
| **leads.controller.ts** | `backend/src/leads/leads.controller.ts` | API endpoints for Leads (`/leads`). |
| **lead.entity.ts** | `backend/src/leads/entities/lead.entity.ts` | Mongoose schema/entity for Lead. |
| **morning.service.ts** | `backend/src/invoices/morning.service.ts` | Integration with Morning (Green Invoice) API. |
| **NotificationsService.ts** | `backend/src/services/NotificationsService.ts` | Unified WhatsApp/SMS notification logic. |

## 3. Duplication & Legacy Analysis

The project is currently in a transition state from a raw Express/Node.js structure to a structured NestJS architecture. This has resulted in several duplicate locations.

### Duplicate Services/Models
| Component | NestJS (Active) | Legacy (Deprecated/Duplicate) |
|-----------|-----------------|-------------------------------|
| **Lead Model** | `src/leads/entities/lead.entity.ts` | `src/models/Lead.ts` |
| **Order Model** | `src/orders/schemas/order.schema.ts` | `src/models/Order.ts` |
| **Lead Logic** | `src/leads/leads.service.ts` | `src/services/LeadsService.ts` |
| **Common Services**| `src/services/NotificationsService.ts` | (Used by both legacy routes and NestJS modules) |

### Mixed Routing
*   **NestJS Controllers**: Located in modules (e.g., `src/leads/leads.controller.ts`). These are registered in `app.module.ts`.
*   **Legacy Routes**: Located in `src/routes/` (e.g., `src/routes/leads.ts`). **Constraint:** Verify if `main.ts` is still mounting these routes via `app.use('/api', ...)` or if they are effectively dead code.

**Recommendation:**
In the next cleanup phase, verify if `src/models` and `src/routes` are still being used by `src/main.ts` or `src/index.ts`. If not, they should be archived.
