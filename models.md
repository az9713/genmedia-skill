# Verified model recipes (session-cached, re-verify if a call 4xxs)

## kie.ai — nano-banana-2-lite (verified 2026-07-31, working)
- Endpoint: `POST https://api.kie.ai/api/v1/jobs/createTask`, `Authorization: Bearer $KIE_API_KEY`
- Body: `{ "model": "nano-banana-2-lite", "input": { "prompt", "aspect_ratio" (1:1|16:9|9:16|...|auto), "image_urls" (opt, max 10) } }`
- Poll: `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=` → `data.state` waiting|queuing|generating|success|fail; result in `data.resultJson` → `{resultUrls:[...]}`; URLs expire ~24h — download immediately
- Cost: **4 credits/image** (measured)
- Balance check: `GET https://api.kie.ai/api/v1/chat/credit` → `data` = credits remaining
- Other nano banana docs: https://docs.kie.ai/market/google/nanobanana2.md (NB2), .../nano-banana.md, .../pro-image-to-image.md (Pro)
- Docs index: https://docs.kie.ai/llms.txt (kie.ai pages 403 direct fetch; use docs.kie.ai *.md)

## kie.ai — kling-2.6/text-to-video (verified 2026-07-31, working)
- Body: `{ "model": "kling-2.6/text-to-video", "input": { "prompt" (max 1000ch), "sound" (bool, true doubles price), "aspect_ratio" (1:1|16:9|9:16), "duration" ("5"|"10") } }`
- Cost: **55 credits ≈ $0.28 per 5s no-audio** (measured); 10s or sound ≈ 2×. Gen time ~2 min. Insufficient credits → 402, no charge.
- Other Kling docs: kling-3-0.md, v3-turbo-text-to-video.md (3-15s, 720p/1080p, pricier), v2-1-*.md
- Credit rate implied: ~200 credits/$1 (nano-lite 4cr≈$0.02, kling 55cr≈$0.28)

## fal.ai — fal-ai/nano-banana (verified 2026-07-31, working)
- Endpoint: `POST https://queue.fal.run/fal-ai/nano-banana`, `Authorization: Key $FAL_API_KEY`
- Body: `{ "prompt" (req), "num_images" (1-4, def 1), "aspect_ratio" (21:9|16:9|3:2|4:3|5:4|1:1|4:5|3:4|2:3|9:16), "output_format" (jpeg|png|webp), "seed", "sync_mode" }`
- Poll: `GET https://queue.fal.run/<model>/requests/<request_id>/status` → IN_QUEUE|IN_PROGRESS|COMPLETED|FAILED; result: `GET .../requests/<request_id>` → `images[].url`
- Cost: ~$0.039/image (listed)
- **Schema discovery trick**: fal.ai/models pages are bot-blocked (Vercel checkpoint). Fetch the OpenAPI instead: `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<model-id>` — works for ANY fal model, gives full input/output schema.
