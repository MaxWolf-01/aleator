#!/bin/bash
# Nginx setup for Aleator

set -e

echo "🔧 Setting up Nginx..."

# Install Nginx
apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
cat > /etc/nginx/sites-available/aleator << 'EOF'
server {
    listen 80;
    server_name aleatoric.agency www.aleatoric.agency;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/aleator /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Reload Nginx
systemctl reload nginx

echo "✅ Nginx configured!"
echo ""
echo "Next: Run certbot for SSL"
echo "certbot --nginx -d aleatoric.agency -d www.aleatoric.agency"