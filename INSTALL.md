# Installing PLNT (plnt-trmnl)

This guide walks you from "I just heard about plnt-trmnl" to "I have it running, the TRMNL screen updates daily, and my plants are getting their care data filled in automatically."

## What you'll need

- A **TRMNL device** (OG or X). [Buy one at usetrmnl.com.](https://usetrmnl.com/)
- A **server** to run plnt-trmnl on. Tested on: Mac mini, Synology NAS, Raspberry Pi 4, generic Linux box. Anything that runs Docker is fine.
- **Docker** + Docker Compose installed on the server.
- **An AI tool** that can run on a schedule (or manually copy-paste prompts). Recommended: [Claude Desktop](https://claude.ai/download) (free), which has built-in Scheduled Tasks. Other supported: ChatGPT (paid tier with scheduled tasks), Cursor, Ollama + cron, n8n. Free + interactive options work too — just kick off the prompt manually whenever you add a plant.

## Install

```bash
git clone https://github.com/<your-org-or-fork>/plnt-trmnl.git
cd plnt-trmnl
cp .env.example .env
# Edit .env — set TRMNL_API_KEY and TRMNL_PLUGIN_UUID (instructions below)
docker compose up -d
```

That's it. The API runs on `:3900`, the renderer on `:3901`. Open `http://localhost:3900` in a browser.

## First-time setup (claim your instance)

When the API starts for the first time it generates a one-time setup token in its logs:

```
[auth] No admin password set — setup token: ABCD-1234-EFGH
[auth] Visit / and enter this token to claim this instance.
```

Find it with:

```bash
docker compose logs plant-api | grep "setup token"
```

Visit `http://localhost:3900` — you'll be redirected to a **Welcome** page. Paste the setup token, choose a password (minimum 12 characters), and you're in. Subsequent visits show a login page.

### Lost your password?

```bash
docker compose exec plant-api node scripts/reset-password.js
```

This clears the password and all sessions. Restart the API (`docker compose restart plant-api`) and a fresh setup token will appear in the logs.

## Set up your TRMNL plugin

1. In your TRMNL dashboard, create a new **Private Plugin**.
2. Choose strategy: **Webhook**.
3. Copy the **Plugin UUID** and the **Plugin Markup**.
4. Paste the Liquid template from `docs/trmnl-templates/full-view.liquid` into the plugin's markup editor (Full view tab → click in the code area → paste → save).
5. Set `TRMNL_API_KEY` and `TRMNL_PLUGIN_UUID` in `.env`. Restart the renderer: `docker compose restart plant-renderer`.

The renderer will push a screen update on the schedule set in `RENDER_CRON` (default: 5 AM daily).

## Connect your AI

This is the magic — plnt-trmnl gives you a pre-written prompt that teaches your AI tool how to enrich your plants on a schedule.

1. Open `http://localhost:3900/settings` in a browser.
2. Click **Copy AI setup prompt**.
3. Pick your AI tool from the recipes below. Each takes ~2 minutes.

### Recipe — Claude Desktop (recommended)

1. Open Claude Desktop.
2. Click your profile → **Scheduled Tasks** → **New Task**.
3. Paste the prompt as the task instructions.
4. Set schedule: **Every hour**.
5. Save.

That's it. Claude Desktop now polls your plnt-trmnl every hour, fills in any pending plants, and suggests care updates for any flagged conditions.

### Recipe — ChatGPT (paid, with Scheduled Tasks)

1. Open ChatGPT (Plus / Team / Enterprise account required for Scheduled Tasks).
2. Settings → Scheduled Tasks → New.
3. Paste the prompt. Schedule: hourly.
4. Save.

### Recipe — Cursor / VS Code with Continue / etc.

Most IDE-embedded AIs don't have scheduled tasks. Use them for manual one-shot enrichment: paste the prompt into a chat, and it will go through the loop once. Run again whenever you add a plant.

### Recipe — Ollama + cron

```bash
# Install ollama, pull a capable model (e.g., llama3.1:70b for plant knowledge)
ollama pull llama3.1:70b

# Save the prompt copied from Settings to ~/plnt-trmnl-prompt.txt

# Add a crontab entry to run the prompt hourly:
# crontab -e
0 * * * * ollama run llama3.1:70b "$(cat ~/plnt-trmnl-prompt.txt)" >> /tmp/plnt-ai.log 2>&1
```

(Note: Ollama plant-knowledge quality varies by model. For best results use a 70B+ model with broad training data.)

### Recipe — n8n / make.com / Zapier

These platforms have HTTP-request nodes. Build a workflow that:
1. GET `http://<plnt-trmnl-host>:3900/api/plants?enrichment=pending`
2. For each plant, call your AI integration with the setup prompt + the plant context.
3. POST the AI's output to `http://<plnt-trmnl-host>:3900/api/plants/{id}/enrichment`.

Schedule the workflow hourly. Same pattern for `/api/conditions?care_update=pending`.

## First plant

1. Open `http://localhost:3900` (or `/dashboard`).
2. Click **Add plant**, type a name (e.g., "Pothos in living room").
3. Save. The plant lands in the dashboard with a "pending enrichment" indicator.
4. Wait up to an hour (or trigger your AI tool manually).
5. The plant fills in: species, care interval, watering description, conditions, 15-25 facts.

## Troubleshooting

### Pending count not dropping

- Open Settings. The pending counts show how many plants and conditions are waiting on your AI.
- If the count never drops: your AI tool's scheduled task isn't running, isn't reaching the API, or isn't following the prompt.
- Test the endpoints by hand: `curl http://localhost:3900/api/plants?enrichment=pending` should return your pending plants. If it's empty, the issue is with the AI's writes; if it's full, the issue is with the AI tool's scheduled task itself.
- Check your AI tool's logs (Claude Desktop: **Settings → Scheduled Tasks → click task → View logs**).

### TRMNL not refreshing

- Check renderer logs: `docker compose logs plant-renderer`.
- Verify `TRMNL_API_KEY` and `TRMNL_PLUGIN_UUID` are set in `.env` (typo-prone — TRMNL keys are mixed-case).
- Confirm the Liquid template is pasted in the TRMNL plugin (Full view tab) and saved.

### Backups directory permission errors

- Default backups go to `./backups` (a folder next to `docker-compose.yml`).
- To override: set `BACKUP_PATH=/your/path` in `.env`.
- The directory must exist and be writable by the Docker user.

### Forgot the admin password / locked out

```bash
docker compose exec plant-api npm run reset-auth
```

Prompts for a new password (≥12 characters), updates the stored hash, and
clears every active session — so you'll be asked to log in again on every
device. Non-interactive form for scripts:

```bash
docker compose exec plant-api npm run reset-auth -- --password 'mynewpassword'
```

If the API container won't start (e.g. corrupted DB), run the same script
from the host against the SQLite file directly:

```bash
DATABASE_PATH=/path/to/plants.db npm --prefix packages/api run reset-auth
```

## Limitations

- **Single-user only.** The auth gate (#136) protects the dashboard and API with a single admin password. Multi-user accounts, OAuth, and 2FA are not supported. The enrichment callback endpoints (`POST /api/plants/:id/enrichment`, `POST /api/conditions/:id/care-update`) currently inherit the same gate; if your AI tool runs from a different machine, it'll need to authenticate as the admin (cookie-based) — API-key auth for the callback is planned for v1.1.
- **In-app feedback is unauthenticated** by design (community can drop feedback without an account). If you don't want this, fork and tighten the `requireAuth` allowlist.
- **AI quality varies.** Different AI tools produce different fact tone / care-data accuracy. The setup prompt is tuned for Claude / GPT-4 family models. Smaller / cheaper models may need additional in-context examples.
