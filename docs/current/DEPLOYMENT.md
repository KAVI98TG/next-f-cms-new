# NEXT F CMS — Deployment Guide

This is the current operator deployment guide. Version-specific release records may narrow the deployment scope further; they must not silently broaden it.

## 1. Install the locked dependencies

```powershell
npm ci
```

Do not run `npm audit fix --force` as part of a release deployment. Dependency changes require their own reviewed release.

## 2. Finalize the release locally

```powershell
npm run release:finalize
```

This runs the complete static regression suite, targeted release gate, frontend production build, and Worker/API TypeScript check. It updates `RELEASE-STATE.json` to canonical only after all required checks pass.

If any step fails, stop and fix the source before deployment.

## 3. Frontend-only release

For releases whose version record says **Pages/frontend only**:

```powershell
npm run deploy
```

`npm run deploy` runs the release gate/build again and deploys `dist` to the existing Cloudflare Pages project `nextf-cms` on branch `main`.

Cloudflare will print a unique `*.nextf-cms.pages.dev` deployment URL. That is the immutable deployment URL; the production custom domain remains `https://cms.nextf.lk` when `main` is the production branch and the custom domain remains attached.

Do **not** deploy the API Worker or run D1 migrations for a frontend-only release.

## 4. API/Worker release

Only when the version-specific release record explicitly includes Worker/API changes:

```powershell
npm run deploy:api:production
npm run deploy
```

If migrations are required, follow the numbered forward-only migration instructions in that release record before or between deployments as specified there. Never invent a migration step.

## 5. Verify production

Check the latest Pages deployment:

```powershell
npx wrangler@latest pages deployment list --project-name nextf-cms
```

Open `https://cms.nextf.lk` and hard-refresh the browser. For releases requiring full production acceptance, run:

```powershell
cloudflared access login https://cms-api.nextf.lk
$env:NEXTF_ACCESS_TOKEN = (cloudflared access token -app=https://cms-api.nextf.lk).Trim()
npm run acceptance:production:final
Remove-Item Env:NEXTF_ACCESS_TOKEN -ErrorAction SilentlyContinue
```

## Production endpoints

- CMS: `https://cms.nextf.lk`
- API: `https://cms-api.nextf.lk`
- Contracts: `https://contracts.nextf.lk/`
- Customer Workspace: `https://workspace.nextf.lk`
