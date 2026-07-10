/* JS Jewelry — web analytics beacon (หน้าลูกค้าเท่านั้น) */
(function () {
  try {
    var p = location.pathname;
    // ไม่นับหน้าแอดมิน
    if (p === '/' || /index\.html$|consignment|add-product|bulk-upload/.test(p)) return;
    var vid = '';
    try {
      vid = localStorage.getItem('_jsj_vid') || '';
      if (!vid) {
        vid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('_jsj_vid', vid);
      }
    } catch (e) {}
    var sku = '';
    var m = p.match(/^\/p\/([^\/?#]+)/);
    if (m) sku = decodeURIComponent(m[1]);
    if (!sku) {
      try { sku = new URLSearchParams(location.search).get('sku') || ''; } catch (e) {}
    }
    var page = m ? 'product' : (p.indexOf('catalog') > -1 ? 'catalog' : (p.indexOf('order') > -1 ? 'order' : 'other'));
    var device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    var data = JSON.stringify({ path: p, page: page, sku: sku, device: device, ref: document.referrer || '', vid: vid });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([data], { type: 'application/json' }));
    } else {
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data, keepalive: true }).catch(function () {});
    }
  } catch (e) {}
})();
