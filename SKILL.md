---
name: genmedia
description: Generate images/video/audio via pay-as-you-go model aggregators (kie.ai first, fal.ai fallback) instead of Higgsfield. Use when the user asks to generate, create, or render images, video, or other media with AI models (Nano Banana, GPT-Image, Kling, Seedance, Flux, etc.), or types /genmedia.
---

# /genmedia — pay-as-you-go media generation

Route requests to the cheapest connected provider, generate via API, save locally with a prompt sidecar. You own everything; nothing lives on a subscription service.

## Hard rules (never break)

1. **Budget.** If the user states a budget, it is a hard ceiling — estimate cost per generation BEFORE calling any API and stop before exceeding it. If no budget stated and the request would cost more than $1, quote the total and ask first.
2. **Video always gets a cost quote + explicit "go" before generating.** Video is the expensive category.
3. **Never print, echo, or log API key values.** Keys load from `.env` (see Keys). Sidecar JSONs and scripts must not contain key values.
4. **Never generate more items than asked.** "A few" = 3, not 10.
5. **Verify output.** After each generation, confirm the file exists and is non-zero size (`ls -la`). A clean API exit is not success.
6. **Learn in two places.** Any newly discovered fact goes to `models.md` (per-model recipes, measured costs) AND, if it changes how routing/doc-fetching/polling works in general, to this SKILL.md too. Model-specific → models.md only; provider-general → both.

## Keys

Read from environment or nearest `.env` (current dir, then `~/.env`):
- `KIE_API_KEY` — kie.ai
- `FAL_API_KEY` — fal.ai

Load in Node with `process.env` after parsing `.env` manually (3 lines, no dotenv dep). If a needed key is missing, say which name is missing and stop — never ask the user to paste the key into chat.

## Routing

1. **Pick model** from the request. Defaults when user doesn't name one:
   - Images: Nano Banana (latest/cheapest tier available)
   - Video: Kling (latest)
   - Others (Seedance, Flux, GPT-Image, etc.): only if named
2. **Pick provider, cheapest first: kie.ai → fal.ai.** If kie lacks the model or errors twice, fall through to fal.
3. **Verify the model ID before first use.** Model IDs churn. Check `models.md` next to this skill first — it caches verified recipes. If the model isn't there, fetch docs:
   - kie.ai: `https://docs.kie.ai/llms.txt` → find the model's `.md` page (e.g. `https://docs.kie.ai/market/google/nano-banana-2-lite.md`). Do NOT fetch `kie.ai/*` directly — it 403s bots.
   - fal.ai: fetch `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<model-id>` — full input/output schema for any fal model. Do NOT fetch `fal.ai/models/*` pages — Vercel bot checkpoint blocks them.
   After a successful first call, append the verified recipe + measured cost to `models.md` so later sessions skip the fetch.

## References (logos, product shots, faces)

- Reference images live in `<output-dir>/refs/`.
- Logos and products are NEVER described in prompt text — always passed as image input to the model.
- Upload refs to whatever host the chosen provider can fetch: fal storage (`https://fal.ai/docs` file upload) for fal jobs, kie.ai's upload endpoint for kie jobs. Local paths do not work.

## Generating

Write a small Node script in the scratchpad (never inline `node -e`), one script per job batch:

**kie.ai pattern** — create task, poll:
```
POST https://api.kie.ai/api/v1/jobs/createTask
  Authorization: Bearer <KIE_API_KEY>
  { "model": "<verified-id>", "input": { ...per model docs... } }
→ data.taskId
GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=<id>   (poll ~3s; states: waiting|queuing|generating|success|fail)
→ parse data.resultJson (a JSON *string*) → resultUrls[] → download IMMEDIATELY (URLs expire ~24h)
```
Credit balance: `GET https://api.kie.ai/api/v1/chat/credit` → `data` = credits left. Check before/after each batch — that measures real cost and enforces the budget.

**fal.ai pattern** — queue API:
```
POST https://queue.fal.run/<model-id>
  Authorization: Key <FAL_API_KEY>
  { ...input per model docs... }
→ request_id
GET https://queue.fal.run/<model-id>/requests/<request_id>/status   (poll ~3s; IN_QUEUE|IN_PROGRESS|COMPLETED|FAILED)
GET https://queue.fal.run/<model-id>/requests/<request_id>          (result; image URLs in images[].url)
→ download to output dir
```

If a call 4xxs, re-check the input schema against the model docs before retrying — do not retry the same payload more than once.

## Output + logging

- Output dir: **`<cwd>/generations/`** (create if absent) — flat inside, no further subfolders (the gallery reads one flat dir).
- Filename: `<slug>_<model>_<epoch-ms>.<ext>` e.g. `ketone_ga_nano-banana_1785372728661.jpg`.
- **Sidecar JSON, same basename**, written next to every file:
```json
{ "prompt": "...", "model": "...", "provider": "kie|fal", "refs": ["..."], "params": {}, "cost_usd": 0.05, "created": "<iso date>" }
```
- After a batch, report: files created, total spent vs budget, one-line path to the folder.
- Gallery dashboard: `node <this-skill-dir>/gallery.js [dir]` → http://localhost:7777 (zero-dep, masonry grid over `dir`, default = cwd; click item = prompt/model/cost panel + copy buttons). If not running, offer to start it after a batch.

## Cost discipline

Track running spend across the session. Before each API call: `spent + this_call <= budget`, else stop and report what was made and what was skipped.
