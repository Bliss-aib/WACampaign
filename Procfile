# Process types for Railway / Heroku-style platforms.
# The campaign worker is a long-running background process (NOT a web server).
# On Railway: create a service from this repo, then set the start command to
# `npm run worker` (or rely on this Procfile) and configure the env vars listed
# in docs/DEPLOYMENT.md. The Next.js web app itself is deployed on Vercel.
worker: npm run worker
