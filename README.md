# CloudDrop 🌩️

> AWS S3 File Upload Dashboard — React + Node.js + PostgreSQL + GitHub Actions

---

## Prerequisites

Before you clone and run this project, make sure you have the following installed on your machine:

### ✅ Required (everyone)

| App | Min Version | Why you need it | Download |
|-----|-------------|-----------------|----------|
| **VS Code** | Any | Code editor for editing project files | [code.visualstudio.com](https://code.visualstudio.com) |
| **Antigravity** | Any | AI coding assistant (used to build this project) | [Available inside VS Code](https://code.visualstudio.com) |
| **Node.js** | v24+ | Runs the backend server & frontend build | [nodejs.org](https://nodejs.org) |
| **npm** | v9+ | Installs all packages (comes with Node.js) | Included with Node.js |
| **Git** | Any | To clone the repository | [git-scm.com](https://git-scm.com) |

> 💡 Check your versions: `node -v` and `npm -v` in your terminal.

### 🗄️ Database — pick ONE (not both)

| Option | App / Account | Best for |
|--------|--------------|----------|
| **Option A** | [Docker Desktop](https://www.docker.com/products/docker-desktop) | Anyone comfortable with Docker |
| **Option B** | [Neon.tech](https://neon.tech) free account | Anyone who wants zero local setup |

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

| Variable | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
| `AWS_REGION` | S3 bucket region (e.g. `us-east-1`) |
| `S3_BUCKET_NAME` | Your S3 bucket name |
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Express server port (default: 5000) |
| `CLIENT_URL` | Frontend URL for CORS (default: http://localhost:5173) |

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

## EC2 Deployment

```bash
chmod +x scripts/ec2-setup.sh
# Copy to your EC2 instance and run:
bash ec2-setup.sh
```

### GitHub Secrets required

| Secret | Value |
|---|---|
| `EC2_HOST` | Your EC2 public IP or domain |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Contents of your `.pem` file |
| `VITE_API_URL` | `http://YOUR_EC2_IP/api` |

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

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/files/stats` | Total files + size |
| GET | `/api/files` | List files (filter by category/search) |
| POST | `/api/files/upload` | Upload file to S3 |
| GET | `/api/files/:id/download` | Get presigned download URL |
| DELETE | `/api/files/:id` | Delete from S3 + DB |
