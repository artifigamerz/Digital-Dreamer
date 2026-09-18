# RewardHub Pakistan - Gift Card Selling Platform

**RewardHub Pakistan** is a production-ready gift card selling platform operating on a campaign-driven cash reward business model.

---

## 💡 Business Model & Architecture

This platform is **EXCLUSIVELY a Seller Platform**:
- **NO Buyer Features**: No shopping cart, checkout, purchasing, or product store.
- **NO Points/Coins/XP**: No points, coins, XP, reward wallets, balance conversion, or points calculations.
- **Fixed Cash Payouts**: Administrators create buying campaigns specifying the required gift card brand, required denomination, and the exact fixed cash reward (e.g., *Xbox Gift Card Value: Rs. 500* $\rightarrow$ *Seller Cash Payout: Rs. 350*).
- **Dynamic Submission Form Builder**: Administrators can configure custom submission form fields per campaign (e.g. Gift Card Code, Serial Number, Purchase Receipt, Seller Notes, Payout Method).
- **Complete Payout Workflow**: Status lifecycle: `Submitted` $\rightarrow$ `Under Review` $\rightarrow$ `Approved` / `Rejected` $\rightarrow$ `Payment Pending` $\rightarrow$ `Paid`.

---

## 🔑 Demo Credentials

| Role | Email | Password | Access |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@rewardhub.pk` | `admin123` | Full Admin Dashboard (`/admin`) |
| **Seller** | `seller@rewardhub.pk` | `seller123` | Seller Dashboard (`/dashboard`) |

---

## 🚀 Local Development & Deployment

### Quick Start (PowerShell Server)
Run the local HTTP server on port `8080`:

```powershell
powershell.exe -ExecutionPolicy Bypass -File serve.ps1
```

Access live in your browser: `http://localhost:8080/`

---

## 🗄️ Database Structure & Configuration

The application supports both PostgreSQL and SQLite.

### Relational Database Schema
- `users`: Seller and admin accounts.
- `gift_card_brands`: Gift card brand catalogue (Xbox, Microsoft, Shophon, PlayStation, Steam, Google Play, Apple).
- `campaigns`: Buying campaigns with denomination and fixed cash reward amount.
- `campaign_fields`: Custom submission form fields defined per campaign.
- `submissions`: Seller gift card submissions and verification status.
- `payments`: Cash payout records with payout method (EasyPaisa, JazzCash, Bank Transfer) and TRX reference numbers.
- `notifications`: In-app notification logs.
- `audit_logs`: Administrative action logs.
- `site_settings`: Live CMS settings for Hero section, notice banner, FAQs, and contact information.

---

## 📋 Environment Variables (`.env`)

```env
PORT=8080
DATABASE_URL=postgresql://postgres:password@localhost:5432/rewardhub_pk
JWT_SECRET=rewardhub_pk_production_secret_key_2026_9988776655
NEXT_PUBLIC_APP_NAME="RewardHub Pakistan"
NEXT_PUBLIC_APP_URL="http://localhost:8080"
```
