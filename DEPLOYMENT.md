# ASSA Smart Fisheries — Production Deployment Guide 🚀

This guide provides a comprehensive, step-by-step walkthrough to deploy the ASSA Smart Fisheries System fully for **$0/month** using free-tier services.

---

## 🛠️ Architecture & Services Overview

The deployment architecture uses four fully integrated, zero-cost cloud services:

```
┌─────────────────────────────────────────────────────┐
│  Vercel (Free — Hobby Plan)                         │
│  • admin-dashboard  → /admin/                       │
│  • fisher-app       → /fisher/                      │
│  • marketplace      → /market/                      │
│  • Proxy rewrites   → Render Backend (/api/*)       │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼ HTTPS proxy
┌─────────────────────────────────────────────────────┐
│  Render (Free — Web Service)                         │
│  • Node 20 Docker container                         │
│  • Single-instance (SSE compatible)                 │
│  • Ephemeral disk (uploads stored in Cloudinary)   │
└────────────────────────┬────────────────────────────┘
                         │
             ┌───────────┴───────────┐
             ▼ DATABASE_URL          ▼ CLOUDINARY_URL
┌──────────────────────────┐   ┌──────────────────────────┐
│  Neon PostgreSQL (Free)  │   │  Cloudinary (Free)       │
│  • 0.5 GB serverless DB  │   │  • Persistent media store│
│  • Auto-sleeps (5m idle) │   │  • Catches / Profile pic │
└──────────────────────────┘   └──────────────────────────┘
```

---

## 📋 Prerequisites

Before starting, create free accounts on the following platforms:
1. **GitHub** — for hosting the repository (private or public).
2. **Neon DB** (https://neon.tech) — for the serverless PostgreSQL database.
3. **Render** (https://render.com) — for hosting the containerized Node.js backend.
4. **Vercel** (https://vercel.com) — for hosting the React frontends.
5. **Cloudinary** (https://cloudinary.com) — for persistent media uploads.

---

## 🚀 Step 1: Database Setup (Neon PostgreSQL)

Render's free PostgreSQL tier was discontinued. Neon is the industry-best free serverless database with 0.5 GB permanent storage.

1. Log in to [Neon Console](https://console.neon.tech/).
2. Create a new project named `assa-fisheries`.
3. Choose the latest **PostgreSQL** version and choose a region closest to your users.
4. Copy the connection string provided in your dashboard. It should look like this:
   ```env
   postgresql://assa_owner:xxxxxx@ep-cool-resonance-a5xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Save this connection string. It will be used as the **`DATABASE_URL`** in the Render backend configuration.

---

## 📸 Step 2: Media Storage Setup (Cloudinary)

On Render's free tier, the container disk is **ephemeral**. Any files uploaded locally (like catch photos or violation logs) are lost on restarts or redeploys. To make storage persistent, we use Cloudinary.

1. Sign up on [Cloudinary](https://cloudinary.com/) for a free account.
2. In your dashboard, locate the **API Environment Variable** (also called `CLOUDINARY_URL`).
3. It looks like this:
   ```env
   cloudinary://<api_key>:<api_secret>@<cloud_name>
   ```
4. Save this URL. It will be provided as **`CLOUDINARY_URL`** to the Render backend, allowing automatic upload of all catches, profile pictures, and evidence photos.

---

## 🖥️ Step 3: Backend Deployment (Render)

We use Render's Blueprint feature to deploy the backend automatically using the pre-configured [render.yaml](file:///home/iron/Desktop/INTERNSHIP%20PROJECT/assa-smart-fisheries-system%203/render.yaml) file.

1. Push this codebase to your own GitHub repository.
2. Log into [Render Dashboard](https://dashboard.render.com/).
3. Click **New** (top right) ➔ **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect the `render.yaml` file. Under **Service Group Name**, type `assa-fisheries`.
6. Click **Approve**. Render will request values for the environment variables:
   * **`DATABASE_URL`**: Paste your Neon connection string (from Step 1).
   * **`CLOUDINARY_URL`**: Paste your Cloudinary URL (from Step 2).
   * **`CORS_ORIGINS`**: For now, type `*` (we will restrict this once Vercel is set up).
7. Render will build the Docker container and deploy it.
8. Once the build finishes and the service starts, copy your backend URL. It will look like this:
   ```text
   https://assa-api.onrender.com
   ```
9. Test the health check endpoint in your browser by appending `/api/health`:
   ```text
   https://assa-api.onrender.com/api/health
   ```
   It should return: `{"status":"ok", "service":"ASSA Backend", ...}`

---

## 🎨 Step 4: Frontend Deployment (Vercel)

Vercel provides premium, extremely fast global hosting for frontends.

### Part A: Update `vercel.json` with your backend URL
1. Open the [vercel.json](file:///home/iron/Desktop/INTERNSHIP%20PROJECT/assa-smart-fisheries-system%203/vercel.json) file in your codebase.
2. Under `rewrites`, locate the first object:
   ```json
   {
     "source": "/api/(.*)",
     "destination": "https://assa-api.onrender.com/api/$1"
   }
   ```
3. Change `"https://assa-api.onrender.com/api/$1"` to your actual Render backend URL (e.g. `https://your-custom-backend.onrender.com/api/$1`).
4. Commit and push this change to your GitHub repository.

### Part B: Deploy to Vercel
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New** ➔ **Project**.
3. Import your GitHub repository.
4. In the configuration page, configure the following settings:
   * **Framework Preset**: Other (Vite is handled by our script)
   * **Root Directory**: `./` (leave as root)
   * **Build Command**: `npm run build:vercel` (Vercel will run our custom script that compiles all 3 apps and places them in their respective sub-directories).
   * **Output Directory**: `dist`
5. Click **Deploy**.
6. Vercel will install dependencies, build the Admin Dashboard, the Fisher App, and the Marketplace, and output them to a unified folder structure.
7. Once finished, Vercel will generate your live production URL (e.g., `https://assa-fisheries.vercel.app`).

---

## 🔒 Step 5: Post-Deployment Hardening (CORS Config)

To prevent unauthorized domains from hitting your backend API, restrict the CORS origins:

1. Copy your Vercel frontend URL (e.g., `https://assa-fisheries.vercel.app`).
2. Go to your **Render Dashboard**, select your `assa-api` service, and navigate to **Environment**.
3. Find the **`CORS_ORIGINS`** variable.
4. Replace `*` with your Vercel URL.
   * If you have custom domains or want to allow localhost for testing, add them as comma-separated values:
     ```text
     https://assa-fisheries.vercel.app,http://localhost:3001,http://localhost:3002
     ```
5. Click **Save Changes**. Render will redeploy with the restricted CORS rules.

---

## 🌐 Deployed Access Paths

Once deployed, the various panels of your system will be accessible at:

* **Admin Dashboard**: `https://your-project.vercel.app/admin/`
* **Fisher Mobile App**: `https://your-project.vercel.app/fisher/`
* **Digital Marketplace**: `https://your-project.vercel.app/market/`
* **API Engine / Docs**: `https://your-backend.onrender.com/`

---

## 💡 Troubleshooting & Production Notes

### ⚠️ Render Spin-Down (Cold Starts)
Render's free web service spins down after 15 minutes of inactivity. When a new user hits the site, it will trigger a **cold start** taking **30-50 seconds** to spin up the container. 
* **SSE Behavior**: The Server-Sent Events client in the frontend is fully resilient and will automatically re-establish connections once the backend goes live.
* **Keep-Alive**: To avoid cold starts for important presentations, you can use a free pinging service (like UptimeRobot) to hit `https://your-backend.onrender.com/api/health` every 10 minutes.

### ⚠️ Neon Database Auto-Suspend
Neon's free compute units suspend after 5 minutes of database inactivity. The wake-up time is extremely fast (under 1 second), so users will not notice database cold starts.

### 🧹 Manual Seed / Reset
The first database migration will run automatically when the container is built. If you need to seed initial test data (like administrators, mock fishers, and marketplaces):
* In local development, you can run `npm run seed`.
* In production, the DB is fully migrated on boot. A production database will start with a default admin account.
