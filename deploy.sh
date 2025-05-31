#!/bin/bash
# Aleator VPS Deployment Script
# Run this on your VPS after initial setup

set -e  # Exit on error

echo "🚀 Starting Aleator deployment..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    apt install -y docker-compose
fi

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /opt/aleator
cd /opt/aleator

# Clone or pull latest code
if [ -d ".git" ]; then
    echo "📥 Pulling latest code..."
    git pull
else
    echo "📥 Cloning repository..."
    git clone https://github.com/MaxWolf-01/aleator.git .
fi

# Create .env.prod file if it doesn't exist
if [ ! -f ".env.prod" ]; then
    echo "⚙️ Creating .env.prod file..."
    cat > .env.prod << 'EOF'
# PostgreSQL Configuration
POSTGRES_DB=aleator
POSTGRES_USER=aleator
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Backend Configuration
DATABASE_URL=postgresql+asyncpg://aleator:CHANGE_ME_STRONG_PASSWORD@postgres:5432/aleator
JWT_SECRET_KEY=CHANGE_ME_RANDOM_SECRET_KEY
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=["https://aleatoric.agency","http://localhost:3000"]
SQLALCHEMY_ECHO=false
DB_AUTO_CREATE=true

# Frontend Configuration
VITE_API_BASE_URL=https://aleatoric.agency/api
EOF
    echo "⚠️  IMPORTANT: Edit .env.prod and set secure passwords!"
    echo "Run: nano /opt/aleator/.env.prod"
    exit 1
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "✅ Checking service status..."
docker-compose ps

echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set up Nginx reverse proxy (see nginx-setup.sh)"
echo "2. Configure SSL with Let's Encrypt"
echo "3. Set up firewall rules"
echo "4. Configure monitoring"