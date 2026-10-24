.PHONY: dev dev-landing dev-client dev-admin dev-umpire build lint check-fix type-check install format storybook storybook-client storybook-admin storybook-umpire build-storybook

# ngrok forwards to @rotra/client (Next default port 3000; other apps use 3001–3003 in turbo dev)
CLIENT_DEV_PORT ?= 3000
NGROK_CLIENT_DOMAIN ?= rotra-local.ngrok.dev

# Load nvm, optional ngrok to client (port 3000), run all apps via Turborepo
# Skip tunnel: make dev SKIP_NGROK=1
dev:
	@. ${HOME}/.nvm/nvm.sh && nvm use && \
		if [ "$(SKIP_NGROK)" != "1" ]; then \
			command -v ngrok >/dev/null 2>&1 || { echo "error: ngrok not in PATH (install from https://ngrok.com or use: make dev SKIP_NGROK=1)"; exit 1; }; \
			ngrok http $(CLIENT_DEV_PORT) --domain=$(NGROK_CLIENT_DOMAIN) & \
			NGROK_PID=$$!; \
			trap 'kill $$NGROK_PID 2>/dev/null; wait $$NGROK_PID 2>/dev/null || true' EXIT INT TERM HUP; \
		fi; \
		pnpm dev

# Run dev server for the marketing / landing app only (port 3003)
dev-landing:
	@. ${HOME}/.nvm/nvm.sh && nvm use && pnpm --filter @rotra/landing dev

# Run client only + same ngrok tunnel as make dev (open https://$(NGROK_CLIENT_DOMAIN))
# Skip tunnel: make dev-client SKIP_NGROK=1
dev-client:
	@. ${HOME}/.nvm/nvm.sh && nvm use && \
		if [ "$(SKIP_NGROK)" != "1" ]; then \
			command -v ngrok >/dev/null 2>&1 || { echo "error: ngrok not in PATH (install from https://ngrok.com or use: make dev-client SKIP_NGROK=1)"; exit 1; }; \
			ngrok http $(CLIENT_DEV_PORT) --domain=$(NGROK_CLIENT_DOMAIN) & \
			NGROK_PID=$$!; \
			trap 'kill $$NGROK_PID 2>/dev/null; wait $$NGROK_PID 2>/dev/null || true' EXIT INT TERM HUP; \
		fi; \
		pnpm --filter @rotra/client dev

# Run dev server for the admin app only
dev-admin:
	@. ${HOME}/.nvm/nvm.sh && nvm use && pnpm --filter @rotra/admin dev

# Run dev server for the umpire app only
dev-umpire:
	@. ${HOME}/.nvm/nvm.sh && nvm use && pnpm --filter @rotra/umpire dev

# Install all workspace dependencies
install:
	@. ${HOME}/.nvm/nvm.sh && nvm use && pnpm install

# Build all apps
build:
	@. ${HOME}/.nvm/nvm.sh && nvm use && pnpm build

# Lint all apps and packages
lint:
	@. ${HOME}/.nvm/nvm.sh && nvm use && pnpm lint

# Auto-fix safe lint/format issues across all apps via Biome
check-fix:
	@. ${HOME}/.nvm/nvm.sh && nvm use && pnpm --filter @rotra/landing check:fix && pnpm --filter @rotra/client check:fix && pnpm --filter @rotra/admin check:fix && pnpm --filter @rotra/umpire check:fix

# Format and auto-fix all files in apps/ via Biome
format:
	@. ${HOME}/.nvm/nvm.sh && nvm use && pnpm biome format --write apps/

# TypeScript check across the monorepo
type-check:
	@. ${HOME}/.nvm/nvm.sh && nvm use && pnpm type-check

# Run all Storybooks in parallel (client: 6006, admin: 6007, umpire: 6008)
storybook:
	@. ${HOME}/.nvm/nvm.sh && nvm use && pnpm --filter client storybook & pnpm --filter admin storybook & pnpm --filter umpire storybook & wait

# Run Storybook for the client app (port 6006)
storybook-client:
	@. ${HOME}/.nvm/nvm.sh && nvm use && pnpm --filter client storybook

# Run Storybook for the admin app (port 6007)
storybook-admin:
	@. ${HOME}/.nvm/nvm.sh && nvm use && pnpm --filter admin storybook

# Run Storybook for the umpire app (port 6008)
storybook-umpire:
	@. ${HOME}/.nvm/nvm.sh && nvm use && pnpm --filter umpire storybook

# Build Storybook for all apps
build-storybook:
	@. ${HOME}/.nvm/nvm.sh && nvm use && pnpm --filter client build-storybook && pnpm --filter admin build-storybook && pnpm --filter umpire build-storybook
