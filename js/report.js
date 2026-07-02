// ============================================================
//  report.js — รายงานสินค้า PDF/Excel (ฝังรูปที่ 1) สำหรับหน้า Admin
//  ใช้ CONFIG จาก js/config.js + gapi (โหลดโดย index.html แล้ว)
//  ปุ่มเรียก: prExportPDF() / prExportExcel()
// ============================================================

const PR_IMG_PROXY = 'https://jsjewelry.pages.dev/img/';
const PR_COLS = ['sku','picture','name','category','material','weight','gemType','gemWeight','costPrice','sellPrice','promotionPrice','notes','stock','status','ฝากขาย'];

function prEsc(x){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function prNum(n){ if(n===''||n==null) return ''; const v=Number(String(n).replace(/,/g,'')); return isNaN(v)?String(n):v.toLocaleString('en-US'); }
function prImgId(url){ if(!url) return ''; let m;
  if((m=String(url).match(/\/d\/([a-zA-Z0-9_-]{10,})/))) return m[1];
  if((m=String(url).match(/[?&]id=([a-zA-Z0-9_-]{10,})/))) return m[1];
  return ''; }
function prToast(msg, type){ if(typeof showToast==='function') showToast(msg, type); else console.log(msg); }
function prSel(id){ const el=document.getElementById(id); return el?el.value:'all'; }

function prTitle(){
  const cat = prSel('pr-cat'), st = prSel('pr-status'), cs = prSel('pr-consign');
  const parts = [cat==='all'?'ทุกประเภท':(cat==='gems'?'พลอย':cat)];
  parts.push(st==='all'?'ทุกสถานะ':st);
  if(cs==='exclude') parts.push('ไม่รวมฝากขาย');
  if(cs==='only') parts.push('เฉพาะฝากขาย');
  return parts.join(' · ');
}

async function prRows(){
  const cat = prSel('pr-cat'), st = prSel('pr-status'), cs = prSel('pr-consign');
  let rows = [];
  if(cat === 'gems'){
    const resp = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: CONFIG.SHEET_ID, range: CONFIG.GEMS_SHEET + '!A:P' });
    rows = (resp.result.values||[]).slice(1).filter(r=>r&&r[1]).map(r=>({
      sku:(r[1]||'').trim(), name:(r[2]||'')+(r[4]?' ('+r[4]+')':''), category:'พลอย', material:'-', weight:'',
      gemType:r[2]||'', gemWeight:r[3]||'', costPrice:'',
      sellPrice: Math.round((parseFloat(r[6])||0)*(parseFloat(r[3])||0)) || '',
      promotionPrice:r[15]||'', notes:r[9]||'', stock:r[7]||'', status:r[8]||'',
      imageUrl:r[11]||'', consign:''
    }));
  } else {
    const resp = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: CONFIG.SHEET_ID, range: CONFIG.PRODUCTS_SHEET + '!A:W' });
    rows = (resp.result.values||[]).slice(1).filter(r=>r&&r[1]).map(r=>({
      sku:(r[1]||'').trim(), name:r[2]||'', category:r[3]||'', material:r[4]||'', weight:r[5]||'',
      gemType:r[6]||'', gemWeight:r[7]||'', costPrice:r[8]||'', sellPrice:r[9]||'',
      promotionPrice:r[19]||'', notes:r[13]||'', stock:r[10]||'', status:r[11]||'',
      imageUrl:r[12]||'', consign:(r[22]||'').trim()
    }));
    if(cat !== 'all') rows = rows.filter(p=>p.category===cat);
  }
  if(st !== 'all') rows = rows.filter(p=>(p.status||'')===st);
  if(cs === 'exclude') rows = rows.filter(p=>!p.consign);
  if(cs === 'only')    rows = rows.filter(p=>p.consign);
  return rows;
}

async function prExportPDF(){
  try{
    prToast('กำลังเตรียมรายงาน PDF…');
    const rows = await prRows();
    if(!rows.length){ prToast('ไม่มีรายการตามเงื่อนไข','error'); return; }
    const now = new Date().toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'});
    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>รายงานสินค้า — ${prEsc(prTitle())}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4 landscape;margin:9mm}
body{font-family:'Sarabun',sans-serif;font-size:10.5px;color:#1A1A1A;margin:0;padding:14px}
h1{font-size:16px;color:#8A6D2F;margin:0 0 2px}
.sub{font-size:11px;color:#666;margin-bottom:10px}
table{width:100%;border-collapse:collapse}
th{background:#FBF7EE;color:#8A6D2F;font-size:8.5px;text-transform:uppercase;padding:4px 5px;border:1px solid #d8c894;text-align:left}
td{padding:3px 5px;border:1px solid #ddd;vertical-align:middle}
img{width:48px;height:48px;object-fit:cover;border-radius:4px}
tr{page-break-inside:avoid}
.r{text-align:right}
.btn{position:fixed;top:10px;right:12px;padding:8px 18px;background:#C9A84C;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit}
@media print{.btn{display:none}}
</style></head><body>
<button class="btn" onclick="window.print()">🖨 พิมพ์ / บันทึก PDF</button>
<h1>💎 JS Jewelry — รายงานสินค้า</h1>
<div class="sub">เงื่อนไข: <b>${prEsc(prTitle())}</b> · ${rows.length} รายการ · ออกรายงาน ${prEsc(now)}</div>
<table><tr>${PR_COLS.map(c=>`<th>${c}</th>`).join('')}</tr>
${rows.map(p=>{ const id=prImgId(p.imageUrl);
  return `<tr>
  <td><b>${prEsc(p.sku)}</b></td>
  <td>${id?`<img src="${PR_IMG_PROXY+id}" onerror="this.style.display='none'">`:''}</td>
  <td>${prEsc(p.name)}</td><td>${prEsc(p.category)}</td><td>${prEsc(p.material)}</td>
  <td class="r">${prEsc(p.weight)}</td><td>${prEsc(p.gemType)}</td><td class="r">${prEsc(p.gemWeight)}</td>
  <td class="r">${prNum(p.costPrice)}</td><td class="r">${prNum(p.sellPrice)}</td><td class="r">${prNum(p.promotionPrice)}</td>
  <td>${prEsc(p.notes)}</td><td class="r">${prEsc(p.stock)}</td><td>${prEsc(p.status)}</td><td>${prEsc(p.consign)}</td>
</tr>`; }).join('')}
</table></body></html>`);
    w.document.close();
  }catch(e){ console.error(e); prToast('ออกรายงานไม่สำเร็จ: '+((e.result&&e.result.error&&e.result.error.message)||e.message||e),'error'); }
}

function prLoadExcelJS(){
  return new Promise((res,rej)=>{
    if(window.ExcelJS) return res();
    const sc=document.createElement('script');
    sc.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    sc.onload=res; sc.onerror=()=>rej(new Error('โหลดไลบรารี Excel ไม่สำเร็จ'));
    document.head.appendChild(sc);
  });
}

async function prExportExcel(){
  try{
    prToast('กำลังสร้าง Excel + ดึงรูปสินค้า… (อาจใช้เวลาสักครู่)');
    await prLoadExcelJS();
    const rows = await prRows();
    if(!rows.length){ prToast('ไม่มีรายการตามเงื่อนไข','error'); return; }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('รายงานสินค้า');
    ws.columns = [
      {header:'sku',width:12},{header:'picture',width:13},{header:'name',width:34},{header:'category',width:11},
      {header:'material',width:13},{header:'weight',width:8},{header:'gemType',width:14},{header:'gemWeight',width:11},
      {header:'costPrice',width:11},{header:'sellPrice',width:11},{header:'promotionPrice',width:14},
      {header:'notes',width:30},{header:'stock',width:7},{header:'status',width:11},{header:'ฝากขาย',width:15}
    ];
    ws.getRow(1).font = {bold:true};
    ws.getRow(1).fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FFFBF7EE'}};
    rows.forEach(p=>{
      ws.addRow([p.sku,'',p.name,p.category,p.material,p.weight,p.gemType,p.gemWeight,
        p.costPrice===''?'':Number(String(p.costPrice).replace(/,/g,''))||p.costPrice,
        p.sellPrice===''?'':Number(String(p.sellPrice).replace(/,/g,''))||p.sellPrice,
        p.promotionPrice===''?'':Number(String(p.promotionPrice).replace(/,/g,''))||p.promotionPrice,
        p.notes, p.stock===''?'':Number(p.stock), p.status, p.consign]);
    });
    let done = 0;
    for(let i=0;i<rows.length;i++){
      const rowN = i+2;
      ws.getRow(rowN).height = 64;
      ws.getRow(rowN).alignment = {vertical:'middle',wrapText:true};
      const id = prImgId(rows[i].imageUrl);
      if(!id) continue;
      try{
        const r = await fetch(PR_IMG_PROXY+id);
        if(!r.ok) continue;
        const buf = await r.arrayBuffer();
        const imgId = wb.addImage({buffer:buf, extension:'jpeg'});
        ws.addImage(imgId, {tl:{col:1.08,row:rowN-0.97}, ext:{width:80,height:80}, editAs:'oneCell'});
        done++;
        if(done % 25 === 0) prToast(`ดึงรูปแล้ว ${done} รูป…`);
      }catch(e){ console.warn('img fail', rows[i].sku, e); }
    }
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const cat = prSel('pr-cat'), st = prSel('pr-status');
    a.download = `products_${cat}_${st}_${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
    prToast('✅ ดาวน์โหลด Excel เรียบร้อย ('+rows.length+' รายการ, รูป '+done+')');
  }catch(e){ console.error(e); prToast('สร้าง Excel ไม่สำเร็จ: '+((e.result&&e.result.error&&e.result.error.message)||e.message||e),'error'); }
}
