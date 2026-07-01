import { getAllProducts, renderProductPage, render404 } from '../_products.js';

// Cloudflare Pages Function — serves /p/<SKU> as a fully-rendered product page (SSR)
export async function onRequest(context) {
  try {
    const sku = decodeURIComponent(context.params.sku || '').trim();
    const products = await getAllProducts();
    const p = products.find(x => x.sku.toLowerCase() === sku.toLowerCase());
    if (!p) {
      return new Response(render404(sku), {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }
    return new Response(renderProductPage(p), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=1800, s-maxage=1800'
      }
    });
  } catch (e) {
    return new Response('Error: ' + (e && e.message), {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }
}
