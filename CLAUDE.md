 # Claude Code Implementation Guide: Aleator
  ## Project Overview
  You are building **Aleator** (hosted at aleatoric.agency), a web application that helps users make moderation decisions easier through probabilistic randomness. Users can create decision rules (like "have dessert with 67%
  probability") and let RNG guide their choices, making it easier to maintain moderation than relying on willpower alone.
  ## Technical Architecture
  Implementation Guidelines
  Design Principles (Follow the POC!)
  1. Aesthetic: Cozy, Studio Ghibli-inspired with retro solar punk vibes
  2. Simplicity: The app should feel like a beautiful, minimal tool. No feature bloat.
  3. Delight: Add micro-interactions and smooth transitions. Rolling the dice should feel satisfying.
  4. Clarity: Outcomes should be immediately clear and visually distinct.
  5. Responsiveness: Perfect experience on all devices, especially mobile.
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
  CI TESTS can be run locally with the comman `act`, to test the github actions locally.
  USE THE Makefile TO YOUR ADVANTAGE: Read it to get familiar with the common flows, quickly issue commands, ...

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

 For extra context, the original idea tweet:
   A recent dilemma: how to eat less sweet food but still have it in moderation? My solution: Have it with prob 2/3. Abiding
   by the RNG is far easier than resisting temptation! This is surprisingly general! Probabilistic dieting? Vegetarianism? 
  Half the moral benefits, far easier At least personally, I would find "toss a coin at each meal for whether to have meat" 
  more than twice as easy as cutting it entirely. Note: this doesn't work if you can re-roll immediately after - for snacks 
  I can have any time I do one random pick a day, one a meal is also fine I also recommend carrying dice around in your 
  pocket, or having a random number generator on your watch or phone - makes this way easier to do whenever. This is also 
  very useful for analysis paralysis, eg what to eat for dinner or wear I would also be very curious if this helps people 
  cut back on drugs like alcohol/tobacco/etc. You can also change the probability over time, eg if giving something up feels
   really hard, you can do it at 90% each day, and reduce that by 1% every day until it reaches 0 in 3 months.
=>
  1. Pending Roll Persistence
  Losing the confirmation on refresh enables cheating. The roll should be stored as "pending" in
  the database until confirmed. This way:
  - Roll happens → stored as pending
  - Refresh → confirmation dialog reappears
  - Can't roll again until you confirm follow-through
  - Prevents "refresh until favorable outcome" abuse
  2. Re-roll Limits
  Based on the tweet's examples, I'd suggest configurable intervals per decision:
  - Time-based cooldowns: "Can roll every X hours/days"
    - Dessert decision: once per day
    - Meal choices: once per meal (~4-6 hours)
    - Habit decisions: configurable (daily/weekly)
  - NOT occurrence-based caps (e.g., "5 rolls per month")
    - Goes against the "set and forget" philosophy
    - Adds cognitive load of tracking remaining rolls
  The sweet spot seems to be simple time intervals that match natural decision points (meals, days, weeks). Users set it
  once based on their use case and the app enforces it consistently.

## Debugging Commands & Solutions
- **Add shadcn components**: `bunx shadcn@latest add [component-name]`
- **Install dependencies with bun**: `bun add [package-name]`
- **Remove React Query Devtools**: Not needed in production builds

## Personal Preferences
- Store learnings in condensed, actionable form in CLAUDE.md
- Focus on what's useful for future sessions, not minor session-specific details
- Include preferences, style decisions, debugging solutions, and library gotchas

## Critical Design Decisions
- **Follow-through terminology**: Use "follow-through" everywhere, never "compliance"
- **Chart synchronization**: Probability and follow-through must be in sync - saving happens together
- **API endpoints need trailing slashes**: FastAPI redirects without them, causing issues
- **Ruff config**: Use `[lint]` section, not top-level settings in .ruff.toml
- **Database migrations**: During development, don't use Alembic. Just drop and recreate the database from scratch

## Process Control Reminders
- **Ask the user:** Instead of trying to kill running processes, ask the user to do it themselves first.

