.PHONY: install dev dev-queue dev-player dev-admin storybook lint check-fix type-check build check observability-up observability-down e2e e2e-ui e2e-down

# Every target loads nvm first so the Node version always matches .nvmrc
NVM := . $(HOME)/.nvm/nvm.sh && nvm use

install:
	@$(NVM) && pnpm install

# All three apps: queue :9000, player :9001, admin :9002
dev:
	@$(NVM) && pnpm dev

dev-queue:
	@$(NVM) && pnpm --filter @rotra/queue dev

dev-player:
	@$(NVM) && pnpm --filter @rotra/player dev

dev-admin:
	@$(NVM) && pnpm --filter @rotra/admin dev

# The one Storybook, in @rotra/ui (:6006)
storybook:
	@$(NVM) && pnpm --filter @rotra/ui storybook

lint:
	@$(NVM) && pnpm lint

# Auto-fix safe lint and format issues across the workspace (Biome)
check-fix:
	@$(NVM) && pnpm biome check --write .

type-check:
	@$(NVM) && pnpm type-check

build:
	@$(NVM) && pnpm build

# The one gate before merging: lint, type-check, build, decided-math tests. Errors only.
check:
	@$(NVM) >/dev/null && node scripts/check.mjs

# Local Grafana + OpenTelemetry stack (docs/observability.md). Grafana :3000, OTLP :4317/:4318
observability-up:
	@docker compose -f docker-compose.observability.yml up -d

observability-down:
	@docker compose -f docker-compose.observability.yml down

# Playwright regression suite (apps/e2e): REAL data mode against a throwaway LOCAL Supabase.
# Starts or reuses the local stack, rebuilds + migrates + seeds rotra_disposable_e2e, then runs
# Playwright (apps on :9100-9102). Not part of `make check`. Pass Playwright args with
# E2E_ARGS="--project sim" (or E2E_SUITE=sim|ui).
e2e:
	@$(NVM) && pnpm --filter @rotra/e2e e2e $(E2E_ARGS)

e2e-ui:
	@$(NVM) && pnpm --filter @rotra/e2e e2e:ui $(E2E_ARGS)

# Stops the local Supabase stack (never a hosted project)
e2e-down:
	@supabase stop
