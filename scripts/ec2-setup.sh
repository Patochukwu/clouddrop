#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# CloudDrop — EC2 Ubuntu 22.04 Setup Script
# Run once as ubuntu user on a fresh EC2 instance
# ─────────────────────────────────────────────────────────────
set -e

echo "▶ Updating system..."
sudo apt-get update -y && sudo apt-get upgrade -y

echo "▶ Installing Node.js 24 & PostgreSQL..."
curl -4fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs git postgresql postgresql-contrib

echo "▶ Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE USER chukwudinwodi WITH PASSWORD '';" || true
sudo -u postgres psql -c "CREATE DATABASE postgres OWNER chukwudinwodi;" || true
sudo -u postgres psql -c "ALTER USER chukwudinwodi CREATEDB;" || true


echo "▶ Installing PM2..."
sudo npm install -g pm2

echo "▶ Installing Nginx..."
sudo apt-get install -y nginx

echo "▶ Code is already uploaded via rsync..."
cd /home/ubuntu/clouddrop


echo "▶ Setting up .env... (already synced)"

echo "▶ Installing dependencies..."
cd server && npm install
cd ../client && npm install
VITE_API_URL=/api npm run build
cd ..

echo "▶ Configuring Nginx..."
sudo tee /etc/nginx/sites-available/clouddrop > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    # Serve React build
    root /home/ubuntu/clouddrop/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to Express
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/clouddrop /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo "▶ Starting server with PM2..."
cd /home/ubuntu/clouddrop
pm2 start server/server.js --name clouddrop-server
pm2 startup
pm2 save

echo ""
echo "✅ CloudDrop is running!"
echo "   • API : http://YOUR_EC2_IP/api/health"
echo "   • App : http://YOUR_EC2_IP"
echo ""
echo "Next steps:"
echo "  1. Edit /home/ubuntu/clouddrop/server/.env with AWS keys + DATABASE_URL"
echo "  2. Run: cd /home/ubuntu/clouddrop/server && npm run migrate"
echo "  3. Set GitHub Secrets: EC2_HOST, EC2_USER, EC2_SSH_KEY, VITE_API_URL"
