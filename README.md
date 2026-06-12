# CloudDrop 🌩️

> AWS S3 File Upload Dashboard — React + Node.js + PostgreSQL + GitHub Actions

---

## Prerequisites

Before you clone and run this project, make sure you have the following installed on your machine:

### ✅ Required (everyone)

| App             | Min Version | Why you need it                                  | Download                                                  |
| --------------- | ----------- | ------------------------------------------------ | --------------------------------------------------------- |
| **VS Code**     | Any         | Code editor for editing project files            | [code.visualstudio.com](https://code.visualstudio.com)    |
| **Antigravity** | Any         | AI coding assistant (used to build this project) | [Available inside VS Code](https://code.visualstudio.com) |
| **Node.js**     | v24+        | Runs the backend server & frontend build         | [nodejs.org](https://nodejs.org)                          |
| **npm**         | v9+         | Installs all packages (comes with Node.js)       | Included with Node.js                                     |
| **Git**         | Any         | To clone the repository                          | [git-scm.com](https://git-scm.com)                        |

> 💡 Check your versions: `node -v` and `npm -v` in your terminal.

### 🗄️ Database — pick ONE (not both)

| Option       | App / Account                                                    | Best for                          |
| ------------ | ---------------------------------------------------------------- | --------------------------------- |
| **Option A** | [Docker Desktop](https://www.docker.com/products/docker-desktop) | Anyone comfortable with Docker    |
| **Option B** | [Neon.tech](https://neon.tech) free account                      | Anyone who wants zero local setup |

> You do **not** need to install PostgreSQL manually — Docker or Neon.tech handles it.

### ❌ You do NOT need

- PostgreSQL installed natively
- Nginx or Apache
- Any AWS CLI tools (AWS SDK is installed via `npm install`)

---

## Quick Start

### 1. Clone the repo & install dependencies

```bash
git clone https://github.com/your-username/clouddrop.git
cd clouddrop

# Install all dependencies (server + client)
npm install
```

### 2. Set up your environment variables

```bash
cp .env.example server/.env
# Open server/.env and fill in your AWS credentials and DATABASE_URL
```

### 3. Set up PostgreSQL — choose ONE option below

---

#### 🐳 Option A: Docker (recommended if you have Docker Desktop)

> No PostgreSQL installation needed — Docker handles it all.

```bash
# Start the database (runs in the background)
docker-compose up -d
```

That's it. Move on to step 4.

---

#### ☁️ Option B: Neon.tech — free cloud database (no Docker required)

> Use this if you **don't have Docker** or prefer a hosted database.

1. Go to [https://neon.tech](https://neon.tech) and create a **free account**
2. Create a new **project** → copy the **Connection String** (looks like `postgresql://user:pass@host/dbname?sslmode=require`)
3. Open `server/.env` and set:

```env
DATABASE_URL=postgresql://your-user:your-password@your-host.neon.tech/clouddrop?sslmode=require
```

That's it — no local database needed. Move on to step 4.

---

### 4. Run the database migration

```bash
cd server
npm run migrate
```

### 5. Start the backend

```bash
cd server
npm run dev
# Runs on http://localhost:5000
```

### 6. Start the frontend

```bash
cd client
npm run dev
# Opens http://localhost:5173
```

---

## Environment Variables (`server/.env`)

| Variable                | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `AWS_ACCESS_KEY_ID`     | Your AWS access key                                    |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key                                    |
| `AWS_REGION`            | S3 bucket region (e.g. `us-east-1`)                    |
| `S3_BUCKET_NAME`        | Your S3 bucket name                                    |
| `DATABASE_URL`          | PostgreSQL connection string                           |
| `PORT`                  | Express server port (default: 5000)                    |
| `CLIENT_URL`            | Frontend URL for CORS (default: http://localhost:5173) |

---

## AWS S3 — Required Bucket CORS Config

Go to your S3 bucket → **Permissions → CORS** and paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["http://localhost:5173", "https://your-domain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

---

## EC2 & CloudFront Production Architecture

The production environment is served securely over HTTPS via AWS CloudFront and protected by AWS WAF:

```
                  ┌──────────────────────────────────────────────┐
                  │              AWS CloudFront CDN              │
                  │        (d2q0tos3eezbrk.cloudfront.net)       │
                  │                                              │
  User's Device  ───► HTTPS (Port 443)                           │
                  │    ├── AWS WAF: Web Application Firewall     │
                  │    │   └── SizeRestrictions_BODY (Count/Off) │
                  │    └── Custom Origin ───────────────────────┐│
                  └─────────────────────────────────────────────┼┘
                                                                │
                  ┌─────────────────────────────────────────────▼┘
                  │                  EC2 Server                  │
                  │                                              │
                  │   HTTP (Port 80 via Nginx)                   │
                  │    ├── Serves: client/dist/ (React SPA)      │
                  │    └── Proxies: /api/ ──────────────────────┐│
                  │                                             ││
                  │    ┌───────────────────────────┐            ││
                  │    │      PM2 (backend)        │◄───────────┘│
                  │    │ Runs: Express on port 5000│             │
                  │    └───────────────────────────┘             │
                  └──────────────────────────────────────────────┘
```

1. **AWS CloudFront**: Serves as the HTTPS endpoint, forwarding static request traffic and API requests to the EC2 server custom HTTP origin.
2. **AWS WAF**: Associated with CloudFront to block malicious traffic. The `SizeRestrictions_BODY` rule group is configured to **Count** (instead of Block) to allow multipart file uploads greater than 8KB.
3. **Port 80 (Nginx)**: Runs on EC2, serves the compiled React client files from `/home/ubuntu/clouddrop/client/dist`, and acts as a reverse proxy forwarding `/api/` traffic to the Express server on port 5000.
4. **Port 5000 (Express)**: Managed by PM2 as the process `backend`, handling database migrations, file management logic, and S3 signatures.
5. **Database**: PostgreSQL runs locally on the standard port `5432` on the EC2 instance.

---

### Syncing Updates from Local to EC2

To update the website and server code on your EC2 instance without setting up a full CI/CD pipeline immediately, follow these steps:

#### 1. Rebuild the Client Locally

Run this command from the root of your local workspace to build the React application with relative API routing (`/api`):

```bash
cd client
VITE_API_URL=/api npm run build
```

#### 2. Sync Files to EC2 using Rsync

From the workspace root, run the following commands to upload the built assets and server files (replace the pem key path if yours is different):

**Sync the backend (server):**

```bash
rsync -avz --progress \
  -e "ssh -i /path/to/clouddrop.pem -o StrictHostKeyChecking=no" \
  --exclude='node_modules' \
  --exclude='.git' \
  server/ \
  ubuntu@ec2-18-212-225-209.compute-1.amazonaws.com:~/clouddrop/server/
```

**Sync the frontend build:**

```bash
rsync -avz --delete --progress \
  -e "ssh -i /path/to/clouddrop.pem -o StrictHostKeyChecking=no" \
  client/dist/ \
  ubuntu@ec2-18-212-225-209.compute-1.amazonaws.com:~/clouddrop/client/dist/
```

#### 3. Restart the Server on EC2

SSH into the EC2 instance or run the restart command remotely:

```bash
ssh -i /path/to/clouddrop.pem ubuntu@ec2-18-212-225-209.compute-1.amazonaws.com "pm2 restart backend"
```

---

### Resolved Issues & Architectural Fixes

If you or your co-developers are looking at the code changes, here are the critical fixes we applied to make this stage work:

#### 1. S3 Signature Mismatch on Uploads

- **Symptom**: Some files uploaded successfully, but others failed with: _"The request signature we calculated does not match the signature you provided."_
- **Root Cause**: The multer-s3 middleware was sending the raw `file.originalname` in the custom S3 metadata header (`x-amz-meta-originalname`). File names with spaces, special characters, or Unicode characters corrupted the AWS Signature V4 headers calculation.
- **Fix**: Wrapped the metadata filename in `encodeURIComponent(...)` inside [uploadMiddleware.js](file:///Users/chukwudinwodi/Desktop/clouddrop/server/src/middleware/uploadMiddleware.js) to guarantee only safe ASCII is transmitted in HTTP headers.

#### 2. CORS Block on Remote Devices & IPs

- **Symptom**: The site worked on local hosts but failed to load lists or upload files when accessed via the EC2 public IP on other devices.
- **Root Cause**: The client had a hardcoded `VITE_API_URL` pointing to localhost or a specific DNS, and the Express CORS rules only allowed specific origins.
- **Fix**:
  - Compiled the client with a relative path (`/api`).
  - Updated the backend CORS setup in [app.js](file:///Users/chukwudinwodi/Desktop/clouddrop/server/src/app.js) to dynamically match the incoming request's `Host` header for same-origin requests.

#### 3. Express Wildcard Match Errors on Node 24

- **Symptom**: Express server crashed on startup on newer Node versions with: _"PathError: Missing parameter name at index 1: _"\*
- **Root Cause**: The newer `path-to-regexp` version used by modern Node environments rejects bare wildcards (`*`).
- **Fix**: Changed the client-serving fallback route in [app.js](file:///Users/chukwudinwodi/Desktop/clouddrop/server/src/app.js) to a regular expression `/^(?!\/api).*$/` to cleanly serve the React index page for all non-API paths.

#### 4. Mobile Layout Overflow

- **Symptom**: Dashboard panels and dropzones were clipped/stretched horizontally on phone screens.
- **Root Cause**: Unwrapped flex rows in the category selectors forced the layout to stretch past the screen. In CSS Grid, grid items default to `min-width: auto`, allowing them to grow dynamically.
- **Fix**: Added `min-width: 0` to `.panel` cards and `minmax(0, 1fr)` to the layout grids to force the browser to fit items cleanly inside the mobile viewport.

---

### GitHub Secrets Required

| Secret         | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| `EC2_HOST`     | `ec2-18-212-225-209.compute-1.amazonaws.com` (or `18.212.225.209`) |
| `EC2_USER`     | `ubuntu`                                                           |
| `EC2_SSH_KEY`  | Contents of your private key `.pem` file                           |
| `VITE_API_URL` | `/api` (or relative path config)                                   |

---

## Project Structure

```
clouddrop/
├── client/          # React (Vite) frontend
├── server/          # Node.js + Express backend
├── scripts/         # EC2 setup script
├── .github/         # GitHub Actions CI/CD
├── docker-compose.yml
└── .env.example
```

## API Endpoints

| Method | Path                      | Description                            |
| ------ | ------------------------- | -------------------------------------- |
| GET    | `/api/health`             | Health check                           |
| GET    | `/api/files/stats`        | Total files + size                     |
| GET    | `/api/files`              | List files (filter by category/search) |
| POST   | `/api/files/upload`       | Upload file to S3                      |
| GET    | `/api/files/:id/download` | Get presigned download URL             |
| DELETE | `/api/files/:id`          | Delete from S3 + DB                    |

## Contributors

L
Chukwuma chisom linda
