// Shared product data + rendering for JS Jewelry per-product SEO pages.
export const SHEET_ID = '1Tk53rhDhYRxTkGpXvbd55hMYlTJ83stwG0H3yoZrMDo';
export const SITE = 'https://jsjewelry.pages.dev';
export const LINE_URL = 'https://line.me/R/oaMessage/%40888zbakd/?';

const COL = { sku:1,name:2,category:3,material:4,weight:5,gemType:6,gemWeight:7,sellPrice:9,status:11,imageUrl:12,notes:13,size:15,highlight:16,videoUrl:18,promoPrice:19,imageUrl2:20,imageUrl3:21 };
const GEM = { code:1,gemType:2,weight:3,shape:4,size:5,pricePerCt:6,status:8,notes:9,imageUrl:11,origin:12,pieces:13,videoUrl:14,promoPrice:15 };
const CAT_EMOJI = { 'แหวน':'💍','ต่างหู':'✨','จี้':'🔮','กำไล':'📿','สร้อยข้อมือ':'🌟','สร้อยคอ':'💎','พลอย':'💠' };

export function parseCSVRow(row){
  const cells=[]; let cur=''; let inQ=false;
  for(const ch of row){
    if(ch==='"'){ inQ=!inQ; }
    else if(ch===',' && !inQ){ cells.push(cur.trim()); cur=''; }
    else cur+=ch;
  }
  cells.push(cur.trim());
  return cells;
}
function parseCSV(text){ return text.trim().split('\n').slice(1).map(parseCSVRow); }

export function mapRows(prodRows, gemRows){
  const products = (prodRows||[]).map(r=>({
    sku:(r[COL.sku]||'').trim(), name:r[COL.name]||'', category:r[COL.category]||'',
    material:r[COL.material]||'', weight:r[COL.weight]||'', gemType:r[COL.gemType]||'', gemWeight:r[COL.gemWeight]||'',
    sellPrice:parseFloat(r[COL.sellPrice])||0, status:r[COL.status]||'', imageUrl:r[COL.imageUrl]||'',
    notes:r[COL.notes]||'', size:r[COL.size]||'', highlight:r[COL.highlight]||'',
    promoPrice:parseFloat(r[COL.promoPrice])||0, imageUrl2:r[COL.imageUrl2]||'', imageUrl3:r[COL.imageUrl3]||'',
    videoUrl:r[COL.videoUrl]||'', shape:'', origin:'', pieces:0, pricePerCt:0,
  }));
  const gems = (gemRows||[]).map(r=>{
    const wt=parseFloat(r[GEM.weight])||0, ppc=parseFloat(r[GEM.pricePerCt])||0;
    return { sku:(r[GEM.code]||'').trim(), name:r[GEM.gemType]||'', category:'พลอย', material:'', weight:'',
      gemType:'', gemWeight:r[GEM.weight]||'', shape:r[GEM.shape]||'', origin:r[GEM.origin]||'',
      pricePerCt:ppc, sellPrice:Math.round(ppc*wt), status:r[GEM.status]||'', imageUrl:r[GEM.imageUrl]||'',
      notes:r[GEM.notes]||'', size:r[GEM.size]||'', pieces:Number(r[GEM.pieces])||1,
      promoPrice:parseFloat(r[GEM.promoPrice])||0, videoUrl:r[GEM.videoUrl]||'', highlight:'', imageUrl2:'', imageUrl3:'' };
  });
  return [...products, ...gems].filter(p=>p.sku && p.name && p.status!=='สินค้าหมด' && p.status!=='หมดสต็อก' && p.status!=='หยุดขาย');
}

async function fetchSheet(sheetName){
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const r = await fetch(url, { cf:{ cacheTtl:300, cacheEverything:true } });
  if(!r.ok) throw new Error('sheet '+sheetName+' '+r.status);
  return parseCSV(await r.text());
}
export async function getAllProducts(){
  const [p,g] = await Promise.all([ fetchSheet('Products'), fetchSheet('Gems').catch(()=>[]) ]);
  return mapRows(p,g);
}

export function getImgUrl(url){
  if(!url) return ''; let m;
  if(url.includes('drive.google.com/file/d/') && (m=url.match(/\/d\/([a-zA-Z0-9_-]+)/))) return `https://lh3.googleusercontent.com/d/${m[1]}`;
  if(url.includes('drive.google.com/open?id=') && (m=url.match(/id=([a-zA-Z0-9_-]+)/))) return `https://lh3.googleusercontent.com/d/${m[1]}`;
  return url;
}
export const hasPromo = p => p.promoPrice>0 && p.promoPrice<p.sellPrice;
export const effPrice = p => hasPromo(p) ? p.promoPrice : p.sellPrice;
export function fmtPrice(n){ return '฿'+Number(n||0).toLocaleString('en-US'); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

export function renderProductPage(p){
  const imgs = [p.imageUrl,p.imageUrl2,p.imageUrl3].map(getImgUrl).filter(Boolean);
  const mainImg = imgs[0] || `${SITE}/Image%20logo.png`;
  const emoji = CAT_EMOJI[p.category] || '💎';
  const price = effPrice(p), promo = hasPromo(p);
  const off = promo ? Math.round((1-p.promoPrice/p.sellPrice)*100) : 0;
  const url = `${SITE}/p/${encodeURIComponent(p.sku)}`;
  const inStock = p.status==='พร้อมขาย';
  const vurl = (p.videoUrl||'').trim();
  const desc = (p.highlight && p.highlight.trim() && p.highlight.trim()!=='-') ? p.highlight.trim()
             : (p.notes && p.notes.trim()!=='-' ? p.notes.trim() : '');
  const metaDesc = (`${p.name}${p.material?(' '+p.material):''}${p.gemType?(' พลอย'+p.gemType):''} ราคา ${fmtPrice(price)} — JS Jewelry เครื่องประดับเงินแท้ 925 & พลอยแท้ พร้อมส่ง สั่งซื้อผ่าน LINE`+(desc?(' · '+desc):'')).replace(/\s+/g,' ').trim().slice(0,300);

  const rows=[];
  if(p.material) rows.push(['วัสดุ',p.material]);
  if(p.weight && p.weight!=='-') rows.push(['น้ำหนัก',p.weight+' กรัม']);
  if(p.gemType && p.gemType!=='-') rows.push(['อัญมณี',p.gemType]);
  if(p.gemWeight && p.gemWeight!=='-') rows.push(['น้ำหนักพลอย',p.gemWeight+' กะรัต']);
  if(p.shape && p.shape!=='-') rows.push(['รูปทรง',p.shape]);
  if(p.origin && p.origin!=='-') rows.push(['แหล่งกำเนิด',p.origin]);
  if(p.pieces>1) rows.push(['จำนวนเม็ด',p.pieces+' เม็ด']);
  if(p.size && p.size!=='-') rows.push(['ขนาด',p.size]);
  rows.push(['รหัสสินค้า',p.sku]);

  const jsonld = {
    "@context":"https://schema.org","@type":"Product",
    "name":p.name, "sku":p.sku, "category":p.category,
    "image": imgs.length?imgs:[mainImg],
    "description": (desc || metaDesc).slice(0,300),
    "brand":{"@type":"Brand","name":"JS Jewelry"},
    "offers":{"@type":"Offer","priceCurrency":"THB","price":String(price),
      "availability": inStock?"https://schema.org/InStock":"https://schema.org/OutOfStock",
      "url":url,"seller":{"@type":"Organization","name":"JS Jewelry"}}
  };
  if(p.material && p.material.includes('925')) jsonld.material='เงินแท้ 925';

  const title = `${p.name} (${p.sku}) | JS Jewelry เงินแท้ 925`;
  const lineMsg = `สนใจสินค้า ${p.sku}`;
  const thumbs = imgs.length>1 ? `<div class="thumbs">${imgs.map(u=>`<img src="${esc(u)}" alt="${esc(p.name)}" onclick="document.querySelector('.main').src=this.src" loading="lazy">`).join('')}</div>` : '';
  const priceHtml = promo ? `<span class="old">${fmtPrice(p.sellPrice)}</span><span class="price promo">${fmtPrice(price)}</span><span class="badge">-${off}%</span>` : `<span class="price">${fmtPrice(price)}</span>`;
  const rowsHtml = rows.map(([l,v])=>`<div class="row"><span class="l">${esc(l)}</span><span class="v">${esc(v)}</span></div>`).join('');
  const descHtml = desc ? `<div class="desc">${esc(desc)}</div>` : '';
  const videoHtml = vurl ? `<a class="video-btn" href="${esc(vurl)}" target="_blank" rel="noopener">▶ ดูวิดีโอ</a>` : '';

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(metaDesc)}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="product">
<meta property="og:site_name" content="JS Jewelry">
<meta property="og:title" content="${esc(p.name)} | JS Jewelry">
<meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:image" content="${esc(mainImg)}">
<meta property="og:url" content="${esc(url)}">
<meta property="product:price:amount" content="${price}">
<meta property="product:price:currency" content="THB">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--gold:#C9A84C;--gold-d:#8A6D2F;--gold-bg:#FBF7EE;--bg:#FAFAFA;--t1:#1A1A1A;--t2:#6B6B6B;--t3:#ABABAB;--red:#C0271E;--border:rgba(0,0,0,.08)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Sarabun',sans-serif;background:var(--bg);color:var(--t1);line-height:1.6}
img{display:block;max-width:100%}a{color:inherit;text-decoration:none}
.nav{background:linear-gradient(135deg,#2B1A0E,#3E2A1A 55%,#4A3220);border-bottom:1px solid rgba(201,168,76,.35);height:60px;display:flex;align-items:center;padding:0 20px;position:sticky;top:0;z-index:10}
.nav a{color:var(--gold);font-weight:700;letter-spacing:1.5px;font-size:16px;display:flex;align-items:center;gap:8px}
.nav .sub{font-size:9px;color:rgba(255,255,255,.4);letter-spacing:1px;display:block;font-weight:400}
.wrap{max-width:960px;margin:0 auto;padding:22px 20px 60px}
.crumb{font-size:12px;color:var(--t3);margin-bottom:16px}.crumb a:hover{color:var(--gold-d)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}@media(max-width:720px){.grid{grid-template-columns:1fr;gap:18px}}
.main{width:100%;aspect-ratio:1;object-fit:cover;border-radius:16px;background:var(--gold-bg);border:1px solid var(--border)}
.thumbs{display:flex;gap:8px;margin-top:8px}.thumbs img{width:62px;height:62px;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer}
.cat{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--gold-d);margin-bottom:6px}
h1{font-size:24px;font-weight:700;line-height:1.3;margin-bottom:4px}
.sku{font-size:12px;color:var(--t3);margin-bottom:14px}
.price-box{background:var(--gold-bg);border:1px solid rgba(201,168,76,.25);border-radius:12px;padding:14px 18px;margin-bottom:16px}
.price{font-size:30px;font-weight:700;color:var(--gold-d);letter-spacing:-1px}.price.promo{color:var(--red)}
.old{font-size:16px;color:var(--t3);text-decoration:line-through;margin-right:10px}
.badge{display:inline-block;background:var(--red);color:#fff;font-size:12px;font-weight:700;padding:2px 8px;border-radius:5px;margin-left:8px;vertical-align:middle}
.status{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;background:rgba(92,186,125,.12);color:#2d7a50;margin-top:10px}
.rows{border:1px solid rgba(201,168,76,.22);border-radius:12px;padding:4px 16px;margin-bottom:16px;background:#fff}
.row{display:flex;gap:12px;padding:9px 0;font-size:14px;border-bottom:1px dashed rgba(201,168,76,.3)}.row:last-child{border-bottom:none}
.row .l{color:var(--t3);min-width:96px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.4px}
.row .v{color:var(--t1);font-weight:500;flex:1}
.desc{font-size:14px;color:var(--t2);background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:16px;white-space:pre-line}
.line-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:10px;background:#06C755;color:#fff;font-weight:700;font-size:15px;margin-bottom:10px}
.video-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:10px;background:#C0271E;color:#fff;font-weight:700;font-size:15px;margin-bottom:10px}
.back{display:inline-block;font-size:13px;color:var(--gold-d);font-weight:600}
.footer{background:linear-gradient(135deg,#2B1A0E,#3E2A1A);color:rgba(255,255,255,.4);text-align:center;padding:22px;font-size:12px;letter-spacing:.5px}.footer span{color:var(--gold)}
</style>
</head>
<body>
<header class="nav"><a href="/catalog">💎 <span>JS Jewelry<span class="sub">FINE JEWELLERY</span></span></a></header>
<main class="wrap">
<nav class="crumb"><a href="/catalog">หน้ารวมสินค้า</a> › ${esc(p.category)} › ${esc(p.name)}</nav>
<div class="grid">
  <div>
    <img class="main" src="${esc(mainImg)}" alt="${esc(p.name+' '+(p.material||'')+' JS Jewelry')}">
    ${thumbs}
  </div>
  <div>
    <div class="cat">${emoji} ${esc(p.category)}</div>
    <h1>${esc(p.name)}</h1>
    <div class="sku">รหัสสินค้า: ${esc(p.sku)}</div>
    <div class="price-box">
      ${priceHtml}
      <div><span class="status">${inStock?'✓ พร้อมขาย':esc(p.status)}</span></div>
    </div>
    <div class="rows">${rowsHtml}</div>
    ${descHtml}
    <a class="line-btn" href="${LINE_URL}${encodeURIComponent(lineMsg)}" target="_blank" rel="noopener">💬 สอบถาม / สั่งซื้อทาง LINE</a>
    ${videoHtml}
    <a class="back" href="/catalog">← ดูสินค้าอื่นทั้งหมด</a>
  </div>
</div>
</main>
<footer class="footer">© <span>JS Jewelry</span> — เครื่องประดับเงินแท้ 925 &amp; พลอยแท้ · <a href="/catalog" style="color:rgba(255,255,255,.6)">แคตตาล็อกสินค้า</a></footer>
</body>
</html>`;
}

export function render404(sku){
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>ไม่พบสินค้า | JS Jewelry</title><meta name="robots" content="noindex"><style>body{font-family:'Sarabun',sans-serif;text-align:center;padding:80px 20px;color:#333}a{color:#8A6D2F;font-weight:600}</style></head><body><h1>ไม่พบสินค้า ${esc(sku)}</h1><p>อาจถูกขายไปแล้ว หรือรหัสไม่ถูกต้อง</p><p><a href="/catalog">← กลับไปหน้ารวมสินค้า</a></p></body></html>`;
}

export function buildProductSitemap(products){
  const urls = products.map(p=>`  <url><loc>${SITE}/p/${encodeURIComponent(p.sku)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
