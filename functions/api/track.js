// POST /api/track — บันทึกการเข้าชมเว็บลง D1 (binding: ANALYTICS)
export async function onRequestPost({ request, env }) {
  const json = (o, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
  try {
    if (!env.ANALYTICS) return json({ ok: false, err: 'no-binding' }, 500);
    const d = await request.json().catch(() => ({}));
    const path = String(d.path || '').slice(0, 200);
    if (!path) return json({ ok: false }, 400);
    const page = String(d.page || '').slice(0, 50);
    const sku = String(d.sku || '').slice(0, 50);
    const device = String(d.device || '').slice(0, 20);
    const ref = String(d.ref || '').slice(0, 200);
    const vid = String(d.vid || '').slice(0, 60);
    await env.ANALYTICS.prepare(
      "INSERT INTO visits (ts, path, page, sku, device, referrer, visitor_id) VALUES (datetime('now'), ?, ?, ?, ?, ?, ?)"
    ).bind(path, page, sku, device, ref, vid).run();
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false }, 500);
  }
}
