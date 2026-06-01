# CloudDrop 🌩️

> AWS S3 File Upload Dashboard — React + Node.js + PostgreSQL + GitHub Actions

## Quick Start

### 1. Fill in your AWS credentials

```bash
cp .env.example server/.env
# Edit server/.env with your real values
```

### 2. Start local PostgreSQL (Docker)

```bash
docker-compose up -d
```

### 3. Run the database migration

```bash
cd server
npm run migrate
```

### 4. Start the backend

```bash
cd server
npm run dev
# Runs on http://localhost:5000
```

### 5. Start the frontend

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
