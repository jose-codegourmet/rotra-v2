.PHONY: install dev dev-queue dev-player dev-admin storybook lint check-fix type-check build

# Every target loads nvm first so the Node version always matches .nvmrc
NVM := . $(HOME)/.nvm/nvm.sh && nvm use

install:
	@$(NVM) && pnpm install

# All three apps: queue :3000, player :3001, admin :3002
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
