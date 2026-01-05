<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AutoWriter Multisite

This project is an automated article generation system for WordPress Multisite.

## 📁 System Components

- **Central Dashboard (Frontend)**: React + Vite app (this root directory).
- **Backend API**: Node.js + Express service (`/backend`).
- **WordPress Plugin**: PHP plugin for Multisite (`/wordpress-plugin`).

## 🚀 How to Run

### 1. WordPress Plugin
1. Copy the `wordpress-plugin` folder to your WordPress `wp-content/plugins/` directory.
2. Network Activate the plugin.
3. Configure the HMAC secret in Network Admin > AutoWriter.

### 2. Backend API
1. Navigate to `backend/`.
2. Run `npm install`.
3. Run `npm run dev`.
4. Ensure you have your API keys ready (Gemini, OpenRouter, etc.).

### 3. Central Dashboard
1. Run `npm install` in the root.
2. Run `npm run dev`.
3. Open the app in your browser.

## 🛠 Features Implemented
- [x] Full UI for Dashboard, Settings, and Uploads.
- [x] WordPress REST API Integration.
- [x] SSRF-protected media sideloading.
- [x] SEO integration (Yoast/RankMath).
- [x] LLM Output Validation & Auto-Repair (AJV).
- [x] Multi-step AI Pipeline (T0 to T11).
- [x] Automatic Image Generation (DALL-E 3).
- [x] Editorial Styles & Templates (seeding included).
