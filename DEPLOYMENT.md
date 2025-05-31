# Aleator VPS Deployment Guide

## Quick Start

### 1. SSH into your VPS
```bash
ssh root@YOUR_SERVER_IP
```

### 2. Clone and prepare
```bash
cd /opt
git clone https://github.com/MaxWolf-01/aleator.git
cd aleator
chmod +x deploy.sh nginx-setup.sh
```

### 3. Configure environment
```bash
cp .env.example .env.prod
nano .env.prod
```

**Required changes:**
- `POSTGRES_PASSWORD`: Set a strong password
- `JWT_SECRET_KEY`: Generate with `openssl rand -base64 32`
- `DATABASE_URL`: Update with your postgres password
- `CORS_ORIGINS`: Change to `["https://aleatoric.agency"]`
- `VITE_API_BASE_URL`: Set to `https://aleatoric.agency/api`

### 4. Deploy
```bash
./deploy.sh
```

### 5. Set up Nginx
```bash
./nginx-setup.sh
```

### 6. SSL Certificate
```bash
certbot --nginx -d aleatoric.agency -d www.aleatoric.agency
```

### 7. Firewall
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 8. Test
```bash
# Check API
curl http://YOUR_SERVER_IP/api/health

# Check frontend
curl http://YOUR_SERVER_IP
```

## Monitoring & Maintenance

### Check logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Database backup
```bash
docker exec postgres pg_dump -U aleator aleator > backup.sql
```

### Update deployment
```bash
cd /opt/aleator
git pull
docker-compose build
docker-compose up -d
```

## Troubleshooting

- **Port conflicts**: Check with `netstat -tulpn`
- **Docker issues**: `docker-compose down` then `up -d`
- **Nginx errors**: Check `/var/log/nginx/error.log`
- **SSL renewal**: `certbot renew --dry-run` to test