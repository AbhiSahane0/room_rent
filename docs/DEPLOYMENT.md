# Deployment: Supabase + Cloudflare R2 + Render (API) + Vercel (web)

Do the steps in this order. Each step gives you a value the next one needs.

## 1. Supabase (database)
1. Create a project. Settings > Database > Connection string.
2. Copy the **pooled** string (port 6543) and add `?pgbouncer=true&connection_limit=1` -> this is `DATABASE_URL`.
3. Copy the **direct** string (port 5432) -> this is `DIRECT_URL`.
4. From your computer (where your `.env` has these two values): `npm install && npm run db:deploy`.
5. Create the owner login and import your Excel register (see README "Import an existing Excel register"):
   `npm run db:import -- /path/RENT.xlsx --dry-run`, then without `--dry-run`.
   Set `SEED_ADMIN_USERNAME` and a strong `SEED_ADMIN_PASSWORD` (12+ characters) first.

## 2. Cloudflare R2 (documents)
1. Create a bucket and keep it **private**.
2. Create an API token with *Object Read & Write* for that bucket.
3. Note `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.

## 3. Render (API)
1. Render dashboard > New > **Blueprint** > select this repository. It reads `render.yaml`.
2. Fill the prompted values: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, the four `R2_*`, and `CORS_ORIGINS` (use a placeholder like `https://placeholder.vercel.app` for now). `JWT_SECRET` and `JWT_REFRESH_SECRET` are generated for you.
3. Deploy. The container applies database migrations, then starts. Open `https://<your-service>.onrender.com/health`: it should return `{"success":true,"data":{"status":"ok"}}`.
4. Note the service address. This is your API address.

## 4. Vercel (website)
1. Vercel > Add New > Project > import this repository. Leave the **Root Directory** as the repo root; `vercel.json` provides the build command, output folder, deep-link rewrite and security headers.
2. Settings > Environment Variables: `EXPO_PUBLIC_API_URL` = your Render address (no trailing slash). Add it for Production **and** Preview.
3. Edit `vercel.json` and replace `https://api.example.com` in the `connect-src` rule with the same Render address, commit and push.
4. Deploy. Note the address Vercel gives you (or attach your own domain).

## 5. Connect them
1. Render > your service > Environment: set `CORS_ORIGINS` to the Vercel address (and your custom domain if any). Save: Render redeploys.
2. Open the Vercel address, sign in, and check Home, a tenant, a bill's PDF and a document upload.

## 6. Give it to the client
- **iPhone:** open the Vercel address in Safari > Share > **Add to Home Screen**.
- **Laptop:** just use the address (or install it from Chrome's address bar).
- Change the owner password in More > Settings > Profile & Security.

## Notes
- Render's `free` plan sleeps when idle; use `starter` for an always-on API.
- Whenever the database schema changes, the Render deploy runs the new migrations automatically on start.
- Do not commit `.env` files or the Excel register. Secrets live only in Render, Vercel and your own computer.
- Changing the API address later means: update `EXPO_PUBLIC_API_URL` in Vercel, `connect-src` in `vercel.json`, and redeploy the site.
