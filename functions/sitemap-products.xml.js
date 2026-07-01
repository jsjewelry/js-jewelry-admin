import { getAllProducts, buildProductSitemap } from './_products.js';

// Cloudflare Pages Function — serves /sitemap-products.xml (all product URLs, auto from Google Sheet)
export async function onRequest() {
  try {
    const products = await getAllProducts();
    return new Response(buildProductSitemap(products), {
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'public, max-age=3600'
      }
    });
  } catch (e) {
    return new Response('Error: ' + (e && e.message), { status: 500 });
  }
}
