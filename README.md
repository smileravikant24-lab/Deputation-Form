# Deputation Application Form (SAO Cadre)

Official online deputation registration portal for Senior Audit Officer (SAO) cadre with email OTP verification, file uploads (Photo & Signature), automated Google Sheets recording, and dynamic PDF generation.

---

## 🚀 Quick Setup & Deployment Guide

### Step 1: Google Apps Script Backend Setup
1. Create a new Google Spreadsheet in your Google Drive (e.g. named `Deputation Form SAO`).
2. Go to **Extensions** > **Apps Script**.
3. Replace the code in `Code.gs` with the content of [`Code.gs`](Code.gs).
4. Run the `setup()` function once to create the necessary sheet (`Dep Form New Delhi`) and headers, and grant required permissions.

### Step 2: Deploy as Web App
1. Click **Deploy** > **New deployment**.
2. Select type: **Web app**.
3. Set:
   - **Description**: `Deputation Form SAO v1`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone` (CRITICAL for GitHub Pages access)
4. Click **Deploy** and copy the generated **Web App URL** (e.g., `https://script.google.com/macros/s/AKfycb.../exec`).

### Step 3: Configure Frontend (`index.html`)
1. Open [`index.html`](index.html).
2. Find line 301:
   ```javascript
   const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
   ```
3. Replace `"YOUR_APPS_SCRIPT_WEB_APP_URL_HERE"` with your copied Web App URL.
4. Save and commit.

### Step 4: Host on GitHub Pages
1. Go to your GitHub repository: `https://github.com/smileravikant24-lab/Deputation-Form`.
2. Go to **Settings** > **Pages**.
3. Under **Branch**, select `main` and root `/`, then click **Save**.
4. Your live form will be available at:
   `https://smileravikant24-lab.github.io/Deputation-Form/`
