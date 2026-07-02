// Cloudflare Pages Function — image proxy for Google Drive images (adds CORS)
// GET /img/<driveFileId>  →  fetches lh3.googleusercontent.com/d/<id>=w400 and returns bytes with CORS *
// Used by consignment.html to embed product photos in Excel reports.
export async function onRequest(context) {
  const id = (context.params.id || '').trim();
  if (!/^[a-zA-Z0-9_-]{10,80}$/.test(id)) {
    return new Response('bad id', { status: 400 });
  }
  const upstream = `https://lh3.googleusercontent.com/d/${id}=w400`;
  const r = await fetch(upstream, { cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!r.ok) return new Response('not found', { status: 404 });
  const headers = new Headers();
  headers.set('content-type', r.headers.get('content-type') || 'image/jpeg');
  headers.set('access-control-allow-origin', '*');
  headers.set('cache-control', 'public, max-age=86400');
  return new Response(r.body, { status: 200, headers });
}
