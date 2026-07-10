// GET /api/stats — สถิติเข้าชมเว็บ (อ่านจาก D1 binding: ANALYTICS)
// เวลาไทย = UTC+7 → bucket รายวันใช้ date(ts,'+7 hours')
export async function onRequestGet({ env }) {
  const json = (o, s = 200) =>
    new Response(JSON.stringify(o), {
      status: s,
      headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' }
    });
  try {
    if (!env.ANALYTICS) return json({ ok: false, err: 'no-binding' }, 500);
    const db = env.ANALYTICS;
    const one = async (sql) => (await db.prepare(sql).all()).results[0] || {};
    const all = async (sql) => (await db.prepare(sql).all()).results || [];
    const today = await one(
      "SELECT COUNT(*) c, COUNT(DISTINCT visitor_id) u FROM visits WHERE date(ts,'+7 hours') = date('now','+7 hours')"
    );
    const d7 = await one(
      "SELECT COUNT(*) c, COUNT(DISTINCT visitor_id) u FROM visits WHERE ts >= datetime('now','-7 days')"
    );
    const d30 = await one(
      "SELECT COUNT(*) c, COUNT(DISTINCT visitor_id) u FROM visits WHERE ts >= datetime('now','-30 days')"
    );
    const topSku = await all(
      "SELECT sku, COUNT(*) c FROM visits WHERE sku <> '' AND ts >= datetime('now','-30 days') GROUP BY sku ORDER BY c DESC LIMIT 5"
    );
    const byPage = await all(
      "SELECT page, COUNT(*) c FROM visits WHERE ts >= datetime('now','-30 days') GROUP BY page ORDER BY c DESC"
    );
    const daily = await all(
      "SELECT date(ts,'+7 hours') d, COUNT(*) c, COUNT(DISTINCT visitor_id) u FROM visits WHERE ts >= datetime('now','-14 days') GROUP BY d ORDER BY d"
    );
    return json({ ok: true, today, d7, d30, topSku, byPage, daily });
  } catch (e) {
    return json({ ok: false }, 500);
  }
}
