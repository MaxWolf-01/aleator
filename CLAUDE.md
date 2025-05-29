 # Claude Code Implementation Guide: Aleator
  ## Project Overview
  You are building **Aleator** (hosted at aleatoric.agency), a web application that helps users make moderation decisions easier through probabilistic randomness. Users can create decision rules (like "have dessert with 67%
  probability") and let RNG guide their choices, making it easier to maintain moderation than relying on willpower alone.
  ## Core Features & Requirements
  <requirements>
  ### Must-Have Features
  1. **Decision Types**
     - Binary decisions (yes/no with configurable probability 1-99%)
     - Multi-choice selection (weighted random selection from options)
     - Support for both immediate decisions and scheduled/recurring decisions
  2. **Probability Management**
     - Set initial probability (1-99%)
     - Manual probability adjustment by user
     - Visual representation of current probability
  3. **Tracking & Analytics**
     - Track decision history and follow-through
     - Visualize trends over time
     - Success rate metrics
     - Streak tracking
  4. **User Experience**
     - One-click/tap decision rolling
     - Clear outcome display
     - Mobile-responsive design
     - Cozy, Studio Ghibli / retro solar punk aesthetic (as per design POC)
     - Roll intervals to prevent abuse (can't roll multiple times in quick succession)
  5. **Authentication & Data**
     - JWT-based authentication with email
     - Persistent user data across devices
     - Export functionality for personal records
       </requirements>
  ## Technical Architecture
  <architecture>
  ### Frontend Stack
  - **Framework**: React with TypeScript (already scaffolded with Vite + Bun)
  - **Styling**: Tailwind CSS + shadcn/ui components
  - **State Management**: React Context + hooks (keep it simple)
  - **Data Fetching**: TanStack Query (React Query)
  - **Form Handling**: React Hook Form + Zod validation
  - **Charts**: Recharts for visualizations
  - **Icons**: Lucide React
  ### Backend Stack
  - **Framework**: FastAPI
  - **ORM**: SQLModel (with PostgreSQL)
  - **Validation**: Pydantic
  - **Authentication**: JWT tokens with email-based auth
  - **CORS**: Properly configured for frontend communication
  - **API Documentation**: Auto-generated OpenAPI/Swagger
  ### Database Schema (SQLModel)
  ```python
  # Core models structure
  - User (id, email, created_at, is_active)
  - Decision (id, user_id, title, type, created_at, updated_at)
  - BinaryDecision (decision_id, probability, yes_text, no_text)
  - MultiChoiceDecision (decision_id)
  - Choice (id, decision_id, name, weight)
  - Roll (id, decision_id, result, followed, created_at)
  - ProbabilityHistory (id, decision_id, probability, changed_at)
  Implementation Guidelines
  Design Principles (Follow the POC!)
  1. Aesthetic: Cozy, Studio Ghibli-inspired with retro solar punk vibes
  2. Simplicity: The app should feel like a beautiful, minimal tool. No feature bloat.
  3. Delight: Add micro-interactions and smooth transitions. Rolling the dice should feel satisfying.
  4. Clarity: Outcomes should be immediately clear and visually distinct.
  5. Responsiveness: Perfect experience on all devices, especially mobile.
  API Design
  1. RESTful: Follow REST conventions strictly
  2. Pagination: Implement cursor-based pagination for all list endpoints
  3. Filtering: Support filtering and sorting on relevant endpoints
  4. Versioning: Use URL versioning (e.g., /api/v1/)
  5. Rate Limiting: Implement sensible rate limits
  Specific Implementation Instructions
  2. Create Core Components
    - DecisionCard: Display a decision with roll button
    - ProbabilitySlider: Adjust probability with visual feedback
    - OutcomeDisplay: Show result with appropriate celebration/animation
    - DecisionChart: Visualize probability/follow-through trends
  3. Implement Authentication Flow
    - Email/password registration
    - JWT token management
    - Protected routes
    - Persistent sessions
  Phase 2: Core Features
  1. Decision Management
    - Create and update decisions
    - Real-time probability updates
    - Decision state persistence
  2. Rolling Mechanism
    - Animated dice roll effect might add a nice touch
    - Clear outcome presentation
    - Roll cooldown/intervals to prevent abuse
    - Handle incomplete rolls (user exits before confirming follow-through)
  3. Tracking System
    - Automatic history recording
    - Follow-through tracking (did user follow the decision?)
    - Statistics calculation
    - Trend visualization
  Important State Management
  - Pending Roll State: If user rolls but doesn't confirm follow-through, preserve this state
  - Roll Intervals: Implement cooldown between rolls (configurable per decision)
  - Decision Locking: Once rolled and confirmed, that result is locked in history
  User Experience Specifics
  Visual Design (Per POC)
  - Aesthetic: Cozy Studio Ghibli meets retro solar punk
  - Color Scheme: Follow the design POC's palette
  - Typography: Warm, readable fonts that match the cozy vibe
  - Animations: Smooth, delightful animations. Dice roll should feel satisfying.
  - Feedback: Immediate visual feedback for all actions.
  Key Interactions
  1. Quick Roll: One-tap access to roll any decision
  2. Probability Adjustment: Smooth slider with live preview
  3. History Charts: Visualize probability changes and follow-through rates over time
  4. Quick Add: Fast decision creation with smart defaults
  5. Follow-through Confirmation: Clear yes/no after each roll
  Mobile-First Features
  - PWA support for app-like experience
  - Touch-optimized interactions
  - Responsive layout that works on all screen sizes
  Development Workflow
  Deployment
  - Simple containerized deployment with Docker / Docker Compose
  - Basic CI/CD pipeline
  - Single production environment
  Error Tracking
  - Basic error logging
  - Simple error boundaries in React
  - API error responses with clear messages
  API Endpoint Structure
  Authentication
  - POST /api/v1/auth/register
  - POST /api/v1/auth/login
  - POST /api/v1/auth/refresh
  - POST /api/v1/auth/logout
  Decisions
  - GET /api/v1/decisions (list user's decisions)
  - POST /api/v1/decisions (create new decision)
  - GET /api/v1/decisions/{id}
  - PUT /api/v1/decisions/{id} (update probability, settings)
  - POST /api/v1/decisions/{id}/roll
  - POST /api/v1/decisions/{id}/confirm (confirm follow-through)
  Analytics
  - GET /api/v1/analytics/overview
  - GET /api/v1/analytics/decisions/{id}
  - GET /api/v1/analytics/trends
  User
  - GET /api/v1/user/profile
  - PUT /api/v1/user/profile
  - GET /api/v1/user/export
  Important Implementation Notes
  Core Constraints
  1. Probability Range: Only allow 1-99% (0% and 100% don't make sense)
  2. Set and Forget: Decisions persist and accumulate data over time
  3. Roll Intervals: Implement cooldown to prevent reroll abuse
  4. Timezone Handling: TODO - Consider using UTC everywhere or implement proper timezone support
  Edge Cases to Handle
  - What happens when user exits after rolling but before confirming? (preserve state if possible)
  - How to handle roll intervals? (per-decision setting, e.g., "can roll every X hours/...")
  - Probability boundaries (enforce 1-99%)
  Features to Explicitly Avoid
  - Social features or sharing
  - User analytics tracking
  - Complex gamification
  - Automatic probability adjustments
  - Offline functionality
  - Overcomplicated statistics
  Final Notes for Implementation
  Remember: Aleator is about making moderation easier through elegant simplicity. Every feature should support the core mission of helping users make better decisions through probability. 
  Focus on creating a cozy, delightful experience that users will actually want to use daily. Keep the interface clean, the interactions smooth, and stay true to the Studio Ghibli-inspired aesthetic. When in doubt, choose the simpler
  implementation that provides clear value to the user.
  Important Coding Standards
  Gather as much relevant context as possible before implementing features. Extensive docs of the libraries used can be found in the external-docs directory. If any information is missing, ABORT and IMMEDIATELY ASK for clarification
  before proceeding.
  Extensive documentation is not required, but inline comments should be used to clarify complex logic.
  Working with Backend
  CRITICAL: When working with the backend code:
  1. Always navigate to the backend directory: cd /home/max/repos/aleator/backend
  2. Always activate the virtual environment: source .venv/bin/activate
  3. If .venv doesn't exist, create it with uv: uv venv .venv
  4. Never use the system Python or global pip installations
  5. All Python commands must be run with the activated venv
  Datetime Handling
  NEVER use datetime.utcnow() - it's deprecated! Always use timezone-aware datetime objects:
  from datetime import datetime, timezone
  # Correct:
  datetime.now(timezone.utc)
  # NEVER: datetime.utcnow()
  important-instruction-reminders
  Do what has been asked; nothing more, nothing less.
  NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
## UI/UX Principles & Learnings
- **Single-page focus**: No separate analytics pages. Charts and metrics integrated directly into decision cards
- **No fluff features**: No "Insights & Recommendations", aggregate metrics, or extra pie charts
- **No active/inactive decisions**: Decisions either exist or are deleted
- **No distracting animations**: Remove pulsating, floating, bouncing animations
- **Dice icons over sparkles**: Use dice icons (Dice1-6) for the aleator theme ("alea iacta est")
- **Account sheet over settings page**: Use shadcn sheet component for account management
- **Design POC is sacred**: Follow the matsu theme colors, Studio Ghibli aesthetic, and layout exactly
- **Probability buttons**: Use +/- buttons for probability adjustment in the main decision card; sliders in the creation form
- **Immediate actions**: No artificial delays on dice rolls
- **Chart integration**: Each card shows its own progress/compliance chart inline

## Debugging Commands & Solutions
- **Add shadcn components**: `bunx shadcn@latest add [component-name]`
- **Install dependencies with bun**: `bun add [package-name]`
- **Remove React Query Devtools**: Not needed in production builds

## Personal Preferences
- Store learnings in condensed, actionable form in CLAUDE.md
- Focus on what's useful for future sessions, not minor session-specific details
- Include preferences, style decisions, debugging solutions, and library gotchas

## Critical Design Decisions
- **Probability updates are NOT saved immediately**: Only save probability when user confirms follow-through
- **Follow-through terminology**: Use "follow-through" everywhere, never "compliance"
- **Chart synchronization**: Probability and follow-through must be in sync - saving happens together
- **API endpoints need trailing slashes**: FastAPI redirects without them, causing issues
- **Ruff config**: Use `[lint]` section, not top-level settings in .ruff.toml
- **Database migrations**: During development, don't use Alembic. Just drop and recreate the database from scratch
