// ============================================================
//  sales-report.js — รายงานการขาย แยกช่องทาง (ขายเอง / ฝากขายรายร้าน)
//  พรีวิวในหน้า + ออก PDF / Excel · ล้อแบบเดียวกับ report.js
//  อ่านแท็บ Sales (A:H) อย่างเดียว — ไม่เขียนอะไรลงชีต
//  ช่องทาง detect จากชื่อสินค้าที่ลงท้าย "(ฝากขาย: ร้าน)"
//    (ปุ่ม 💰 ในหน้า consignment.html เติมให้ตอนขายของฝากขาย)
//  ปุ่มเรียก: srRender() / srExportPDF() / srExportExcel()
//  ใช้ CONFIG (js/config.js) + gapi (โหลดโดย index.html) + showToast
// ============================================================

// ─── helpers ───
function srEsc(x){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function srBaht(n){ return '฿'+Number(n||0).toLocaleString('th-TH'); }
function srToast(msg,type){ if(typeof showToast==='function') showToast(msg,type); else console.log(msg); }
function srVal(id){ const el=document.getElementById(id); return el?el.value:''; }

// วันที่ในชีตเก็บเป็น "DD/MM/พ.ศ." (เช่น 03/07/2569) → แปลงเป็น ISO "YYYY-MM-DD" (ค.ศ.) เพื่อเทียบช่วง
function srToISO(d){
  if(!d) return '';
  const s = String(d).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);      // DD/MM/YYYY (พ.ศ. หรือ ค.ศ.)
  if(m){ let y=+m[3]; if(y>2400) y-=543; return y+'-'+String(+m[2]).padStart(2,'0')+'-'+String(+m[1]).padStart(2,'0'); }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);              // ISO อยู่แล้ว
  if(m) return m[1]+'-'+String(+m[2]).padStart(2,'0')+'-'+String(+m[3]).padStart(2,'0');
  return s;
}

// แยกช่องทางจากชื่อสินค้า → {channel, shop, clean}
function srChannel(name){
  const m = String(name||'').match(/\(\s*ฝากขาย\s*:\s*([^)]+)\)/);
  if(m) return { channel:'ฝากขาย', shop:m[1].trim(), clean:String(name).replace(/\s*\(\s*ฝากขาย\s*:[^)]*\)\s*/,'').trim() };
  return { channel:'ขายเอง', shop:'', clean:String(name||'').trim() };
}

// ─── ดึง + กรองข้อมูลจากชีต ───
async function srFetchAll(){
  const resp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SHEET_ID, range: CONFIG.SALES_SHEET + '!A:H'
  });
  return (resp.result.values||[]).slice(1).filter(r=>r && (r[2]||r[3])).map(r=>{
    const c = srChannel(r[3]||'');
    return {
      date:(r[1]||'').trim(), iso:srToISO(r[1]), sku:(r[2]||'').trim(),
      productName:(r[3]||'').trim(), cleanName:c.clean, channel:c.channel, shop:c.shop,
      qty:Number(r[4]||1), sellPrice:Number(r[5]||0), costPrice:Number(r[6]||0), profit:Number(r[7]||0)
    };
  });
}

function srApplyFilter(all){
  const from=srVal('sr-from'), to=srVal('sr-to'), ch=srVal('sr-channel');
  let rows = all.slice();
  if(from) rows = rows.filter(x=>x.iso && x.iso>=from);
  if(to)   rows = rows.filter(x=>x.iso && x.iso<=to);
  if(ch==='own')          rows = rows.filter(x=>x.channel==='ขายเอง');
  else if(ch==='consign') rows = rows.filter(x=>x.channel==='ฝากขาย');
  else if(ch && ch.indexOf('shop:')===0){ const sh=ch.slice(5); rows = rows.filter(x=>x.shop===sh); }
  return rows;
}

// เติมตัวเลือกร้านฝากขายใน dropdown (ไม่ลบตัวเลือกหลัก คงค่าที่เลือกไว้)
function srFillShops(all){
  const sel = document.getElementById('sr-channel');
  if(!sel) return;
  const cur = sel.value;
  const shops = [...new Set(all.filter(x=>x.channel==='ฝากขาย' && x.shop).map(x=>x.shop))].sort();
  sel.querySelectorAll('option[data-shop]').forEach(o=>o.remove());
  shops.forEach(sh=>{
    const o=document.createElement('option');
    o.value='shop:'+sh; o.textContent='   • ฝากขาย: '+sh; o.setAttribute('data-shop','1');
    sel.appendChild(o);
  });
  if([...sel.options].some(o=>o.value===cur)) sel.value=cur;
}

// จัดกลุ่ม: ขายเอง + ฝากขายแยกร้าน
function srGroup(rows){
  const own = rows.filter(x=>x.channel==='ขายเอง');
  const shops = {};
  rows.filter(x=>x.channel==='ฝากขาย').forEach(x=>{
    const k = x.shop || '(ไม่ระบุร้าน)';
    (shops[k]=shops[k]||[]).push(x);
  });
  return { own, shops };
}
function srSum(list){
  return {
    n:list.length,
    qty:list.reduce((s,x)=>s+x.qty,0),
    sell:list.reduce((s,x)=>s+x.sellPrice*x.qty,0),
    profit:list.reduce((s,x)=>s+x.profit,0)
  };
}
function srTitle(){
  const ch=srVal('sr-channel'), from=srVal('sr-from'), to=srVal('sr-to');
  let chTxt='ทุกช่องทาง';
  if(ch==='own') chTxt='เฉพาะขายเอง';
  else if(ch==='consign') chTxt='เฉพาะฝากขาย (ทุกร้าน)';
  else if(ch && ch.indexOf('shop:')===0) chTxt='ฝากขาย: '+ch.slice(5);
  const range = (from||to) ? ((from||'เริ่มต้น')+' ถึง '+(to||'ล่าสุด')) : 'ทุกช่วงเวลา';
  return chTxt+' · '+range;
}

// ─── พรีวิวในหน้า ───
async function srRender(){
  const el = document.getElementById('sr-container');
  if(el) el.innerHTML = '<div class="loading"><div class="spinner"></div>กำลังโหลด…</div>';
  try{
    const all = await srFetchAll();
    srFillShops(all);
    const rows = srApplyFilter(all);
    if(!rows.length){ if(el) el.innerHTML='<div class="empty"><div class="ic">📊</div>ไม่มีรายการตามเงื่อนไข</div>'; return; }
    const g = srGroup(rows), grand = srSum(rows);
    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:14px">'
      + '<div class="stat"><div class="v">'+grand.n+'</div><div class="l">รายการขาย</div></div>'
      + '<div class="stat"><div class="v">'+grand.qty+'</div><div class="l">จำนวนชิ้น</div></div>'
      + '<div class="stat"><div class="v">'+srBaht(grand.sell)+'</div><div class="l">ยอดขายรวม</div></div>'
      + '<div class="stat"><div class="v" style="color:var(--green)">'+srBaht(grand.profit)+'</div><div class="l">กำไรรวม</div></div>'
      + '</div>';
    const section = (label, list) => {
      const s = srSum(list);
      return '<div style="margin:14px 0 6px;font-weight:700;color:var(--gold)">'+srEsc(label)
        + '<span style="font-weight:400;color:var(--muted);font-size:13px"> — '+s.n+' รายการ · '+s.qty+' ชิ้น · ยอด '+srBaht(s.sell)+' · กำไร '+srBaht(s.profit)+'</span></div>'
        + '<div class="tw"><table><thead><tr><th>วันที่</th><th>รหัส</th><th>สินค้า</th><th>จำนวน</th><th>ราคา/ชิ้น</th><th>ยอดรวม</th><th>กำไร</th></tr></thead><tbody>'
        + list.slice().reverse().map(x=>'<tr>'
          + '<td>'+srEsc(x.date)+'</td><td>'+srEsc(x.sku)+'</td><td>'+srEsc(x.cleanName)+'</td>'
          + '<td>'+x.qty+'</td><td>'+srBaht(x.sellPrice)+'</td><td>'+srBaht(x.sellPrice*x.qty)+'</td>'
          + '<td style="color:var(--green)">'+srBaht(x.profit)+'</td></tr>').join('')
        + '</tbody></table></div>';
    };
    if(g.own.length) html += section('🏪 ขายเอง', g.own);
    Object.keys(g.shops).sort().forEach(sh=>{ html += section('🤝 ฝากขาย: '+sh, g.shops[sh]); });
    if(el) el.innerHTML = html;
  }catch(e){
    console.error(e);
    if(el) el.innerHTML='<div class="empty"><div class="ic">⚠️</div>โหลดไม่สำเร็จ: '+srEsc((e.result&&e.result.error&&e.result.error.message)||e.message||e)+'</div>';
  }
}

// ─── PDF ───
async function srExportPDF(){
  try{
    srToast('กำลังเตรียมรายงาน PDF…');
    const rows = srApplyFilter(await srFetchAll());
    if(!rows.length){ srToast('ไม่มีรายการตามเงื่อนไข','error'); return; }
    const g = srGroup(rows), grand = srSum(rows);
    const now = new Date().toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'});

    const secHtml = (label, list) => {
      const s = srSum(list);
      return '<h2>'+srEsc(label)+'</h2>'
      + '<table><tr><th>วันที่</th><th>รหัส</th><th>สินค้า</th><th class="r">จำนวน</th><th class="r">ราคา/ชิ้น</th><th class="r">ยอดรวม</th><th class="r">กำไร</th></tr>'
      + list.slice().reverse().map(x=>'<tr><td>'+srEsc(x.date)+'</td><td>'+srEsc(x.sku)+'</td><td>'+srEsc(x.cleanName)+'</td>'
        + '<td class="r">'+x.qty+'</td><td class="r">'+srBaht(x.sellPrice)+'</td><td class="r">'+srBaht(x.sellPrice*x.qty)+'</td>'
        + '<td class="r green">'+srBaht(x.profit)+'</td></tr>').join('')
      + '<tr class="sub"><td colspan="3">รวม '+srEsc(label)+'</td><td class="r">'+s.qty+'</td><td></td><td class="r">'+srBaht(s.sell)+'</td><td class="r">'+srBaht(s.profit)+'</td></tr>'
      + '</table>';
    };
    let bodyHtml = '';
    if(g.own.length) bodyHtml += secHtml('🏪 ขายเอง', g.own);
    Object.keys(g.shops).sort().forEach(sh=>{ bodyHtml += secHtml('🤝 ฝากขาย: '+sh, g.shops[sh]); });

    const w = window.open('','_blank');
    w.document.write('<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>รายงานการขาย — '+srEsc(srTitle())+'</title>'
+ '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">'
+ '<style>'
+ '@page{size:A4 landscape;margin:9mm}'
+ 'body{font-family:\'Sarabun\',sans-serif;font-size:11px;color:#1A1A1A;margin:0;padding:14px}'
+ 'h1{font-size:17px;color:#8A6D2F;margin:0 0 2px}'
+ 'h2{font-size:13px;color:#8A6D2F;margin:16px 0 4px;border-bottom:2px solid #d8c894;padding-bottom:2px}'
+ '.sub-hd{font-size:11px;color:#666;margin-bottom:10px}'
+ '.tot{display:flex;gap:22px;flex-wrap:wrap;background:#FBF7EE;border:1px solid #d8c894;border-radius:8px;padding:8px 14px;margin-bottom:6px}'
+ '.tot b{color:#8A6D2F}'
+ 'table{width:100%;border-collapse:collapse;margin-bottom:8px}'
+ 'th{background:#FBF7EE;color:#8A6D2F;font-size:9px;text-transform:uppercase;padding:4px 6px;border:1px solid #d8c894;text-align:left}'
+ 'td{padding:3px 6px;border:1px solid #ddd}'
+ '.r{text-align:right}'
+ '.green{color:#127a3e}'
+ 'tr.sub td{background:#f4efe0;font-weight:700}'
+ 'tr{page-break-inside:avoid}'
+ '.btn{position:fixed;top:10px;right:12px;padding:8px 18px;background:#C9A84C;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit}'
+ '@media print{.btn{display:none}}'
+ '</style></head><body>'
+ '<button class="btn" onclick="window.print()">🖨 พิมพ์ / บันทึก PDF</button>'
+ '<h1>💎 JS Jewelry — รายงานการขาย</h1>'
+ '<div class="sub-hd">เงื่อนไข: <b>'+srEsc(srTitle())+'</b> · ออกรายงาน '+srEsc(now)+'</div>'
+ '<div class="tot">'
+ '<span>รายการขาย: <b>'+grand.n+'</b></span>'
+ '<span>จำนวนชิ้น: <b>'+grand.qty+'</b></span>'
+ '<span>ยอดขายรวม: <b>'+srBaht(grand.sell)+'</b></span>'
+ '<span>กำไรรวม: <b>'+srBaht(grand.profit)+'</b></span>'
+ '</div>'
+ bodyHtml
+ '</body></html>');
    w.document.close();
  }catch(e){ console.error(e); srToast('ออกรายงานไม่สำเร็จ: '+((e.result&&e.result.error&&e.result.error.message)||e.message||e),'error'); }
}

// ─── Excel ───
function srLoadExcelJS(){
  return new Promise((res,rej)=>{
    if(window.ExcelJS) return res();
    const sc=document.createElement('script');
    sc.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    sc.onload=res; sc.onerror=()=>rej(new Error('โหลดไลบรารี Excel ไม่สำเร็จ'));
    document.head.appendChild(sc);
  });
}

async function srExportExcel(){
  try{
    srToast('กำลังสร้าง Excel…');
    await srLoadExcelJS();
    const rows = srApplyFilter(await srFetchAll());
    if(!rows.length){ srToast('ไม่มีรายการตามเงื่อนไข','error'); return; }
    const g = srGroup(rows), grand = srSum(rows);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('รายงานการขาย');
    ws.columns = [
      {header:'วันที่',width:13},{header:'รหัส',width:12},{header:'สินค้า',width:34},
      {header:'ช่องทาง',width:11},{header:'ร้านฝากขาย',width:16},{header:'จำนวน',width:8},
      {header:'ราคา/ชิ้น',width:12},{header:'ยอดรวม',width:13},{header:'กำไร',width:13}
    ];
    const hdr = ws.getRow(1); hdr.font={bold:true}; hdr.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFBF7EE'}};

    const GOLD={type:'pattern',pattern:'solid',fgColor:{argb:'FFF4EFE0'}};
    const addGroup = (label, list) => {
      const s = srSum(list);
      const lr = ws.addRow([label]); lr.font={bold:true,color:{argb:'FF8A6D2F'}};
      list.slice().reverse().forEach(x=>{
        ws.addRow([x.date, x.sku, x.cleanName, x.channel, x.shop||'', x.qty, x.sellPrice, x.sellPrice*x.qty, x.profit]);
      });
      const sr = ws.addRow(['','','รวม '+label,'','', s.qty, '', s.sell, s.profit]);
      sr.font={bold:true}; sr.eachCell(c=>{ c.fill=GOLD; });
      ws.addRow([]);
    };
    if(g.own.length) addGroup('🏪 ขายเอง', g.own);
    Object.keys(g.shops).sort().forEach(sh=>{ addGroup('🤝 ฝากขาย: '+sh, g.shops[sh]); });
    const tr = ws.addRow(['','','รวมทั้งหมด','','', grand.qty, '', grand.sell, grand.profit]);
    tr.font={bold:true,size:12}; tr.eachCell(c=>{ c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE9DCB0'}}; });

    [7,8,9].forEach(col=>{ ws.getColumn(col).numFmt='#,##0'; });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const ch = srVal('sr-channel')||'all';
    a.download = 'sales_'+ch.replace('shop:','')+'_'+new Date().toISOString().slice(0,10)+'.xlsx';
    a.click();
    URL.revokeObjectURL(a.href);
    srToast('✅ ดาวน์โหลด Excel เรียบร้อย ('+grand.n+' รายการ)');
  }catch(e){ console.error(e); srToast('สร้าง Excel ไม่สำเร็จ: '+((e.result&&e.result.error&&e.result.error.message)||e.message||e),'error'); }
}
