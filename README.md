# Aleator 🎲

**Make moderation easier with mindful randomness**

Aleator is a beautiful web application that helps users make better decisions through probability-guided choices. Instead of relying on willpower alone, users can create decision rules (like "have dessert with 67% probability") and let RNG guide their choices, making moderation more sustainable and fun.

## ✨ Features

- 🎯 **Binary Decisions** - Yes/No choices with adjustable probability (1-99%)
- 🎨 **Studio Ghibli Aesthetic** - Warm, cozy design inspired by retro solar punk
- 📊 **Analytics Dashboard** - Track decisions, follow-through rates, and trends
- 🔐 **Secure Authentication** - JWT-based auth with beautiful login/register flows
- 📱 **Mobile Responsive** - Perfect experience on all devices
- ✨ **Delightful Animations** - Smooth dice rolling and micro-interactions

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Make (optional, for convenience commands)
- Bun (for frontend development)

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MaxWolf-01/aleator.git
   cd aleator
   ```

2. **Start the full development environment:**
   ```bash
   make dev
   ```
   
   This will:
   - Start PostgreSQL database
   - Start FastAPI backend with hot reload
   - Start Vite frontend dev server
   - Open your browser to http://localhost:5173

3. **Or start services individually:**
   ```bash
   # Backend + Database only
   make dev-backend
   
   # Frontend only (in another terminal)
   make dev-frontend
   ```

### Available Commands

```bash
make help              # Show all available commands
make dev               # Full development environment
make dev-backend       # Backend + database only  
make dev-frontend      # Frontend dev server only
make up                # Production environment
make down              # Stop all services
make logs              # View logs
make db                # Connect to database
make test              # Run tests
make clean             # Clean up Docker resources
make status            # Check service status
```

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Framework:** React 19 with TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **State Management:** TanStack Query + React Context
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts for analytics
- **Build:** Vite + Bun

### Backend (FastAPI + Python)
- **Framework:** FastAPI with Python 3.13
- **Database:** PostgreSQL with SQLModel ORM
- **Authentication:** JWT tokens with bcrypt hashing
- **Validation:** Pydantic models
- **API Docs:** Auto-generated OpenAPI/Swagger

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Development:** Hot reload for both frontend and backend
- **Production:** Nginx for frontend serving
- **Database:** PostgreSQL 16

## 🎨 Design Philosophy

Aleator embraces a **Studio Ghibli-inspired aesthetic** with:

- **Warm Color Palette:** Forest greens, sky blues, honey ambers, soft lavenders
- **Cozy Typography:** Nunito font family with Caveat handwritten accents
- **Gentle Animations:** Floating, sparkling, and gentle bouncing effects
- **Mindful Interactions:** Every click feels intentional and delightful
- **Accessibility First:** WCAG 2.1 AA compliance throughout

## 📊 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Create new account
- `POST /api/v1/auth/login` - Sign in
- `POST /api/v1/auth/logout` - Sign out

### Decisions  
- `GET /api/v1/decisions` - List user's decisions
- `POST /api/v1/decisions` - Create new decision
- `PUT /api/v1/decisions/{id}` - Update decision
- `POST /api/v1/decisions/{id}/roll` - Roll the dice
- `POST /api/v1/decisions/{id}/confirm` - Confirm follow-through

### Analytics
- `GET /api/v1/analytics/overview` - User analytics overview
- `GET /api/v1/analytics/decisions/{id}` - Decision-specific analytics

## 🧪 Testing

```bash
# Backend tests
make test

# Frontend linting
make frontend-lint

# Backend linting  
make backend-lint
```

## 🚢 Deployment

### Production Build
```bash
make up
```

### Environment Variables

Copy `.env.example` files and configure for your environment:
- `backend/.env` - Backend configuration
- `frontend/.env` - Frontend configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following the existing code style
4. Test your changes: `make test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the cozy aesthetics of Studio Ghibli films
- Built with love for mindful decision-making
- Powered by modern web technologies

---

*Made with ✨ and 🎲 by the Aleator team*