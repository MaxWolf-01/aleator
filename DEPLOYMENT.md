# Aleator Production Deployment Guide

## Prerequisites

- Fresh VPS with Debian/Ubuntu (tested on Debian 11)
- Root access
- Domain name pointing to your VPS IP

## Step 1: Initial VPS Setup

SSH into your VPS and run these commands:

```bash
apt update && apt upgrade -y

curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

apt install -y git nginx certbot python3-certbot-nginx
```

## Step 2: Clone and Configure

```bash
cd /opt
git clone https://github.com/MaxWolf-01/aleator.git
cd aleator
cp .env.example .env.prod
vim .env.prod
```

Make these changes:

- `POSTGRES_PASSWORD`: Set a strong password (e.g., generate with `openssl rand -base64 32`)
- `JWT_SECRET_KEY`: Set a different strong secret (e.g., generate with `openssl rand -base64 32`)
- `DATABASE_URL`: Replace `your_password_here` with your POSTGRES_PASSWORD
- `CORS_ORIGINS`: Change to `["https://aleatoric.agency", "https://www.aleatoric.agency"]`
- `VITE_API_BASE_URL`: Set to `https://www.aleatoric.agency`

## Step 3: Build and Start Services

```bash
docker-compose build
docker-compose up -d

docker-compose ps
```

## Step 4: Configure Nginx

Create the Nginx configuration file:

```bash
vim /etc/nginx/sites-available/aleator
```

Add this content:

```nginx
server {
    server_name aleatoric.agency www.aleatoric.agency;
    
    location /api/ {
        # IMPORTANT: No trailing slash on proxy_pass to preserve the full path
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/aleatoric.agency/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/aleatoric.agency/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}
server {
    if ($host = www.aleatoric.agency) {
        return 301 https://$host$request_uri;
    } # managed by Certbot
    if ($host = aleatoric.agency) {
        return 301 https://$host$request_uri;
    } # managed by Certbot
    listen 80;
    server_name aleatoric.agency www.aleatoric.agency;
    return 404; # managed by Certbot
}
```

```bash
# Enable the site and remove default
ln -sf /etc/nginx/sites-available/aleator /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
nginx -t
systemctl reload nginx
```

## Step 5: SSL Certificate

```bash
# Get Let's Encrypt certificate
certbot --nginx -d aleatoric.agency -d www.aleatoric.agency
```

Follow the prompts to complete SSL setup.

## Step 6: Firewall Setup

```bash
apt install -y ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

## Step 7: Final Checks

```bash
curl https://www.aleatoric.agency/api/health

docker-compose logs -f
```

## Maintenance Commands

### View logs

```bash
cd /opt/aleator
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Update application

```bash
cd /opt/aleator
git pull
docker-compose build
docker-compose up -d
```

### Database backup

```bash
# Create backup
docker exec aleator-postgres-1 pg_dump -U aleator aleator > backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i aleator-postgres-1 psql -U aleator aleator < backup_20240101.sql
```

### SSL certificate renewal

```bash
# Test renewal
certbot renew --dry-run

# Force renewal
certbot renew
```

## Troubleshooting

### Check service status

```bash
docker-compose ps
systemctl status nginx
```

### Common issues

- **Port 5432 already in use**: PostgreSQL might be installed locally. Stop it with `systemctl stop postgresql`
- **502 Bad Gateway**: Check if backend is running with `docker-compose logs backend`
- **Permission denied**: Make sure to run commands as root or with sudo

### Reset everything

```bash
cd /opt/aleator
docker-compose down -v  # Warning: deletes database!
docker-compose up -d
```
