# 🌻 Crystolia System - User Journey Guide

This document outlines the complete workflow of the Crystolia DevOps Platform, from the perspective of different users (Customers, Admin, Secretary).

---

## 1. 👤 Customer Flow (The Client)

### Step 1: Registration & Onboarding
1.  **Sign Up**: Customer visits the site and registers via **Google** or **Email/Password**.
2.  **Onboarding**: First-time users are redirected to a "Business Details" form to fill in:
    -   Business Name
    -   H.P. (Company ID)
    -   Official Address & City
3.  **Welcome SMS**: Upon successful registration, the customer receives a generic "Welcome to Crystolia" SMS (via Twilio).

### Step 2: Placing an Order
1.  **Dashboard**: The customer lands on their personalized dashboard.
2.  **New Order**: Clicks "New Order" and selects items (e.g., Sunflower Oil 1L, 5L).
3.  **Submit**: Review the cart and click "Send Order".
4.  **Status**: The order appears in the "My Orders" list with status **Pending** (`המתנה`).

### Step 3: Payment (New!)
1.  **Approval**: Once the Admin approves the order (see Admin Flow), the status changes to **Approved**.
2.  **Payment**: The customer sees a green **"Pay Now"** button on the order details.
3.  **Checkout**: Clicking it opens a payment modal (Mock/Meshulam).
4.  **Completion**: fast payment success updates the order to **Paid**. All invoices are automatically generated (via Green Invoice).

---

## 2. 🛡️ Admin Flow (The Manager)

### Step 1: Order Management
1.  **Dashboard**: Admin sees a high-level view of all **Pending Orders**.
2.  **Review**: Click on a pending order to see details (Customer, Items, Total).
3.  **Action**:
    -   **Approve**: Validates the stock/price and sends it to the customer for payment.
    -   **Reject**: Cancels the order.
    -   **Negotiate**: Can propose a new price if needed (feature in progress).

### Step 2: Business Intelligence (Analytics)
1.  **Graphs**: View monthly revenue charts (Bar/Pie toggle).
2.  **Top Customers**: See who brings in the most revenue.

---

## 3. 👩‍💼 Secretary Flow (Support)

### Step 1: Customer Management
1.  **Search**: Can search for any customer by Name, Email, or Business Name.
2.  **Edit**: Can update customer details (Address, Phone) on their behalf.

### Step 2: Order Assistance
1.  **View History**: Can access any customer's order history to answer support questions.
2.  **Invoices**: Can download/resend invoices manually if a customer asks.

---

## ⚙️ Technical Integrations (Behind the Scenes)
-   **Auth**: Handled by Google OAuth / Passport.js.
-   **Database**: MongoDB (Stores Users, Orders, Products).
-   **Notifications**: Twilio (SMS), WhatsApp (Planned).
-   **Invoicing**: Green Invoice API (Automatic receipt generation).
-   **Infrastructure**: AWS EKS (Kubernetes), orchestrated by Terraform.
