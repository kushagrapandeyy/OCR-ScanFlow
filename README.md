# ScanFlow

**ScanFlow** is a modern, high-performance web application designed to bridge the gap between physical networking and digital CRM pipelines. By leveraging AI-powered Optical Character Recognition (OCR), it instantly converts physical business cards into validated CRM contacts.

Built by **Firmlytic Solutions Pvt. Ltd.**

---

## Architecture

ScanFlow is built as a robust microservice architecture with two core environments:

- **Frontend (`/web`)**: A responsive, glassmorphism-inspired UI built with React (Vite). It utilizes Zustand for local state management, Framer Motion for micro-animations, and CSS modules with dynamic OS-inherited light/dark theming.
- **Backend API (`/api`)**: A Node.js Express service powered by Google Gemini 3.1 Flash Lite for unstructured text extraction. It uses PostgreSQL for persistent storage, Redis/BullMQ for asynchronous export queuing, and a built-in SFTP daemon to push JSON webhooks securely into Chroot-jailed EC2 CRM environments.

## Features

- ⚡️ **Sub-3 Second Extraction**: Snap a photo of a business card and get structured JSON data almost instantly.
- 🎯 **AI Validation**: Gemini handles edge cases, correcting typos in emails and accurately identifying job titles vs. company names.
- 🌓 **Dynamic Theming**: True OS-level dark/light mode inheritance with global symmetry.
- 📦 **Secure Export Microservice**: One-click export to CSV, Excel, or direct SFTP sync to your CRM, generated entirely on the backend to keep the client ultra-lightweight.
- 🔒 **Enterprise Security**: JWT-based authentication, bcrypt hashing, and rate-limited API endpoints.

## Getting Started

### Prerequisites
- Node.js (v20+)
- PostgreSQL Database
- Redis (for background workers)
- Google Gemini API Key

### Backend Setup
```bash
cd api
npm install
# Copy the example environment file and configure your credentials
cp .env.example .env
# Run database migrations
npm run db:migrate
# Start the development server
npm run dev
```

### Frontend Setup
```bash
cd web
npm install
# Start the Vite development server
npm run dev
```

## Deployment
ScanFlow is designed to be highly scalable:
- **Web**: Optimized for Vercel or similar static edge networks.
- **API**: Native support for Render Web Services or AWS EC2 deployments, utilizing `render.yaml` for infrastructure as code.
- **Worker**: Can be split into a separate Render Background Worker for intensive batch export operations.

---

*© 2026 ScanFlow. Powered by AI.*
