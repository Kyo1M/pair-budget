# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PairBudget (ふたりの財布) is a household budget management app for couples, built with Next.js (App Router) and Supabase. The MVP focuses on expense tracking, income recording, advance payments, and settlement between two household members.

## Development Commands

```bash
# Install dependencies (use Node 20.x if .nvmrc exists)
pnpm install

# Run Next.js dev server
pnpm --filter web dev

# Build the Next.js application
pnpm --filter web build

# Lint code
pnpm --filter web lint

# Run tests
pnpm --filter web test
pnpm --filter web test --coverage

# Database migrations
supabase db push --config supabase/config.toml --dry-run  # Preview changes
supabase db push --config supabase/config.toml             # Apply migrations
```

## Architecture

### Workspace Structure

This is a pnpm workspace monorepo:
- `apps/web/` - Next.js App Router application (currently empty, to be initialized)
- `supabase/sql/` - Database migration files (numbered sequentially: 001_schema.sql, etc.)
- `docs/` - Architecture documentation and planning materials

### Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **State Management**: Zustand (planned)
- **Validation**: Zod + react-hook-form (planned)
- **Testing**: Vitest + React Testing Library (planned)
- **Package Manager**: pnpm

### Data Model

Core entities and their relationships:

1. **profiles** - Extends Supabase auth.users with email, name
2. **households** - Represents a couple's shared household
3. **household_members** - Links users to households (role: 'owner' | 'member')
4. **household_join_codes** - One-time codes for inviting partners (6-digit, 24h expiry)
5. **transactions** - Records expenses, income, and advances
   - type: 'expense' | 'income' | 'advance'
   - For advances: `advance_to_user_id` = NULL (household advance) or specific user ID (personal advance)
6. **settlements** - Records when advances are paid back

**MVP Constraint**: Each user belongs to exactly one household.

### State Management Architecture (Planned)

- `useAuthStore` - Session, user, auth actions (signIn, signUp, signOut)
- `useHouseholdStore` - Current household, members, join code generation/consumption
- `useTransactionStore` - Fetch/create/delete transactions
- `useSettlementStore` - Fetch balances (via RPC), record settlements

### RLS Security

All tables use Row Level Security with helper functions:
- `is_household_member(household_id)` - Check if user belongs to household
- `is_household_owner(household_id)` - Check if user owns household

### Service Layer Pattern

Keep `src/services/*` modules thin:
- `services/households.ts` - create, list, join code generation
- `services/transactions.ts` - list, create, delete
- `services/settlements.ts` - list, create
- `services/joinCodes.ts` - create, verify, invalidate

Return typed objects instead of raw Supabase responses.

### Advance (立替) Logic

Two patterns supported:
1. **Household advance** (`advance_to_user_id` = NULL)
   - Advance payment for shared household expenses (e.g., rent, PC)
   - Full amount added to advance balance

2. **Personal advance** (`advance_to_user_id` = specific user)
   - Advance payment for partner's personal expenses
   - Full amount added to advance balance

Balance calculation uses `get_household_balances(household_id)` RPC function.

## Directory Organization

Once Next.js is initialized (`apps/web/`):
- `src/app/` - App Router pages and route groups (lowercase)
- `src/components/` - React components (PascalCase)
  - `components/layout/` - AppShell, headers
  - `components/dashboard/` - SummaryCards, RecentTransactions, BalanceCard
  - `components/modals/` - CreateHouseholdModal, TransactionModal, etc.
- `src/store/` - Zustand stores (useXStore pattern)
- `src/services/` - Supabase API wrappers
- `src/lib/` - Utility functions, supabaseClient.ts

## Testing Strategy

- **Unit tests**: Zustand stores and service layer (Vitest)
- **Component tests**: React Testing Library, co-locate as `<Component>.test.tsx`
- **E2E tests**: Playwright (planned) - happy paths for join code → transaction → settlement
- Mock Supabase clients via dependency injection
- Run with `--runInBand` when using timers or date mocking

## Database Workflow

1. Create new migration files in `supabase/sql/` with sequential numbering
2. Prefer new migrations over editing existing ones
3. Use IF EXISTS / IF NOT EXISTS for idempotent operations
4. Test with `--dry-run` before applying
5. Document schema changes in PR descriptions

## Environment Variables

Required keys (set in `apps/web/.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side operations (keep secret)

Commit `.env.example` with placeholder values for onboarding.

## MVP Categories (Fixed)

食費, 外食費, 日用品, 医療費, 家具・家電, 子ども, その他

## Coding Conventions

- TypeScript strict mode enabled
- Prettier defaults (2-space indent, trailing commas)
- React components: PascalCase
- Utility functions: camelCase
- Zustand hooks: `useXStore` pattern
- Commit messages: Conventional Commits with PB-XX backlog IDs (e.g., `feat: PB-32 add join code modal`)

## Git Workflow

- Base branch: `develop`
- Feature branches: `feature/<topic>`
- PR requirements: summary, screenshots/output, backlog IDs, migration notes
- Verify locally before PR: lint, build, tests, `supabase db push --dry-run`

## Reference Documentation

Key planning documents in `docs/`:
- `mvp-plan.md` - MVP requirements and user flows
- `web-app-mvp-architecture.md` - Detailed architecture design
- `mvp-setup-guide.md` - Environment setup and specifications
- `mvp-backlog.md` - Task tracking (PB-XX numbered items)

Refer to `AGENTS.md` for AI agent-specific guidelines when applicable.
