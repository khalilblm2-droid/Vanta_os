# VANTA OS — Render Deployment Guide

---

## Prerequisites

1. GitHub account with the Vanta_os repository
2. Render account (https://render.com — free signup)
3. PostgreSQL database (Render provides managed Postgres)
4. Redis instance (Render provides managed Redis)
5. Shopify Partner account with app credentials
6. Google Gemini API key

---

## Step 1: Create PostgreSQL Database on Render

1. Go to https://dashboard.render.com
2. Click **New +** → **PostgreSQL**
3. Name: `vanta-os-db`
4. Plan: **Free** (or Starter for production)
5. Click **Create Database**
6. Copy the **Internal Database URL** — you'll need it
7. Copy the **External Database URL** — for migrations

## Step 2: Create Redis Instance on Render

1. Click **New +** → **Redis**
2. Name: `vanta-os-redis`
3. Plan: **Free**
4. Click **Create Redis**
5. Copy the **Redis URL**

## Step 3: Deploy the Web Service

1. Click **New +** → **Web Service**
2. Connect your GitHub account if not already connected
3. Select the `Vanta_os` repository
4. Configure:
   - **Name:** `vanta-os`
   - **Runtime:** Node
   - **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start Command:** `npm run start`
   - **Plan:** Free (or Starter for production)
5. Add Environment Variables (see Step 5 below)
6. Click **Create Web Service**

## Step 4: Deploy the Background Worker (CRITICAL)

> Without this worker, tasks will never be processed.

1. Click **New +** → **Background Worker**
2. Select the same `Vanta_os` repository
3. Configure:
   - **Name:** `vanta-os-worker`
   - **Runtime:** Node
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npm run start:worker`
   - **Plan:** Free (or Starter for production)
4. Add the SAME Environment Variables as the web service (copy all)
5. Click **Create Background Worker**

## Step 5: Environment Variables

Add these to BOTH the Web Service and the Background Worker:

### Required (from Shopify Partner Dashboard):
```
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
```

### Required (from Google AI Studio):
```
GEMINI_API_KEY=your_gemini_api_key
```

### Required (from Render PostgreSQL):
```
DATABASE_URL=<Internal Database URL from Render Postgres>
DIRECT_URL=<External Database URL from Render Postgres>
```

### Required (from Render Redis):
```
REDIS_URL=<Redis URL from Render Redis>
```

### Required (generate with openssl):
```
ENCRYPTION_KEY=<run: openssl rand -base64 32>
ENCRYPTION_SALT=<run: openssl rand -hex 16>
VAULT_SALT=<run: openssl rand -hex 16>
INTERNAL_DOCS_SECRET=<run: openssl rand -hex 32>
AGENCY_SECRET=<run: openssl rand -hex 32>
```

### Required (your Render URL — fill after first deploy):
```
APP_URL=https://vanta-os.onrender.com
SHOPIFY_APP_URL=https://vanta-os.onrender.com
```

### Standard config:
```
NODE_ENV=production
APP_ENV=production
PORT=10000
SHOPIFY_APP_HANDLE=vanta-os
SHOPIFY_API_VERSION=2025-04
SHOPIFY_APP_SCOPES=read_products,write_products,read_inventory,write_inventory,read_locations,read_collections,write_collections,read_metafields,write_metafields,read_themes,read_orders,read_customers,read_price_rules,read_discounts,read_shop_locales,read_markets
GEMINI_MODEL=gemini-2.0-flash-exp
WHITELABEL_MODE=false
```

## Step 6: Update Shopify Partner Dashboard

After your web service is deployed, you'll get a URL like:
`https://vanta-os-xxxx.onrender.com`

Update these in your Shopify Partner Dashboard → Apps → Your App → URLs:

- **App URL:** `https://vanta-os-xxxx.onrender.com`
- **Allowed redirection URI(s):**
  ```
  https://vanta-os-xxxx.onrender.com/auth/callback
  ```

Update Webhooks:
- **app/uninstalled:** `https://vanta-os-xxxx.onrender.com/webhooks/app/uninstalled`
- **customers/redact:** `https://vanta-os-xxxx.onrender.com/webhooks/customers/redact`
- **customers/data_request:** `https://vanta-os-xxxx.onrender.com/webhooks/customers/data_request`
- **shop/redact:** `https://vanta-os-xxxx.onrender.com/webhooks/shop/redact`

Update GDPR mandatory webhooks with the same URLs.

## Step 7: Install on Your Store

Visit:
```
https://vanta-os-xxxx.onrender.com/auth/login?shop=your-store.myshopify.com
```

Complete the OAuth flow. The app should appear in your Shopify Admin.

## Step 8: Verify

- Visit `https://vanta-os-xxxx.onrender.com/health` — should return JSON with `status: ok`
- Check Render logs for the worker — should show `VANTA OS worker ready`
- Open the app in Shopify Admin — should show the onboarding page

## Notes

- Render free tier services spin down after 15 minutes of inactivity. First request after sleep takes ~30s to wake up.
- For production, use the **Starter** plan ($7/month) for both web service and worker to avoid spin-down.
- The worker MUST share the same DATABASE_URL and REDIS_URL as the web service.
- Migrations run automatically during the build step.
