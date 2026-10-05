#!/usr/bin/env node
/**
 * Runs before migrations on Render. Supabase's "direct connection" address (db.<project>.supabase.co) is IPv6 only, and Render
 * only has IPv4, so it fails with "P1001: Can't reach database server". Say so in the log instead of leaving a cryptic error.
 */
const bad = ['DATABASE_URL', 'DIRECT_URL'].filter((k) => {
  try {
    return /^db\.[a-z0-9]+\.supabase\.co$/i.test(new URL(process.env[k] ?? '').hostname);
  } catch {
    return false;
  }
});
if (bad.length) {
  console.error(
    `\n!! ${bad.join(' and ')} use Supabase's DIRECT connection (db.<project>.supabase.co). That address is IPv6 only and Render cannot reach it.\n` +
      `   Fix: in Supabase click Connect > "Session pooler" and copy that string (host aws-0-<region>.pooler.supabase.com, user postgres.<project>).\n` +
      `   Put it in BOTH DATABASE_URL and DIRECT_URL on Render (see docs/DEPLOYMENT.md), then redeploy.\n`,
  );
}
