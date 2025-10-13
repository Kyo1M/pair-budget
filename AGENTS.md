# Repository Guidelines

## Project Structure & Module Organization
This repository is a pnpm workspace; run all commands from the root. The App Router Next.js application lives in `apps/web`, with domain folders under `src/` (`app/`, `components/`, `store/`, `services/`). Architecture notes stay in `docs/`, while Supabase migrations live in `supabase/sql`; number files sequentially and prefer new migrations over edits.

## Build, Test, and Development Commands
`pnpm install` installs workspace dependencies using Node 20 (`.nvmrc`). Use `pnpm --filter web dev` to run the Next.js server and `pnpm --filter web build` before opening a PR. `pnpm --filter web lint` enforces the shared ESLint + Prettier config, and `pnpm --filter web test` executes Vitest suites; add `--coverage` when reporting. Apply database changes with `supabase db push --config supabase/config.toml`, starting with `--dry-run` on feature branches.

## Coding Style & Naming Conventions
Write TypeScript with strict options enabled, using Supabase typed clients rather than `any`. Let Prettier defaults (2-space indent, trailing commas) and ESLint rules handle formatting and hooks. Pages under `src/app` and route groups stay lowercase; React components are PascalCase, Zustand hooks follow the `useXStore` pattern, and utility modules are camelCase. Keep `src/services/*` thin by returning typed objects instead of raw Supabase responses.

## Testing Guidelines
Vitest with React Testing Library is the default; co-locate component tests as `<Component>.test.tsx` and store/service tests under `__tests__/`. Mock Supabase clients via dependency injection so tests stay hermetic. Aim for meaningful coverage of authentication flow, household lifecycle, and transaction calculations, adding regression tests for every bug fix. Run `pnpm --filter web test --runInBand` when suites rely on timers or date mocking.

## Commit & Pull Request Guidelines
Branch from `develop` using `feature/<topic>` (e.g., `feature/join-code-flow`). Commit messages follow Conventional Commits, as in `docs: MVP要件定義とSupabaseスキーマの整備`; prefix backlog IDs (`feat: PB-32 add join code modal`). Each PR needs a concise summary, relevant screenshots or CLI output, linked backlog tickets, and notes on migrations or env updates. Verify lint, build, tests, and `supabase db push --dry-run` locally before requesting review.

## Supabase & Environment Keys
Keep secrets out of version control. Application keys belong in `apps/web/.env.local` with a committed `.env.example` for onboarding. Service-role keys stay in Supabase or deployment secrets, never in the Next.js bundle. When adding new environment variables, update `docs/mvp-setup-guide.md` and flag required rotations in the PR description.
