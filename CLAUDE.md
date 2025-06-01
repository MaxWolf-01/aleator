  CI TESTS can be run locally with the comman `act`, to test the github actions locally.
  USE THE Makefile TO YOUR ADVANTAGE: Read it to get familiar with the flows, quickly issue commands, ...

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

## Critical Design Decisions
- **Chart synchronization**: Probability and follow-through must be in sync - saving happens together
- **API endpoints need trailing slashes**: FastAPI redirects without them, causing issues
- **Ruff config**: Use `[lint]` section, not top-level settings in .ruff.toml
- **Database migrations**: During development, don't use Alembic. Just drop and recreate the database from scratch

## Process Control Reminders
- **Ask the user:** Instead of trying to kill running processes, ask the user to do it themselves first.

