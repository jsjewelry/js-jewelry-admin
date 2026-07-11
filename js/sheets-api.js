// ============================================================
//  sheets-api.js — Google Sheets CRUD
//  Products Sheet columns (A-V):
//  A:id  B:sku  C:name  D:category  E:material  F:weight
//  G:gemType  H:gemWeight  I:costPrice  J:sellPrice
//  K:stock  L:status  M:imageUrl  N:notes  O:createdAt
//  P:size  Q:highlight  R:postStatus  S:videoUrl  T:promoPrice
//  U:imageUrl2  V:imageUrl3   ← รูปเพิ่มเติม (รูปที่ 2-3)
//
//  Sales Sheet columns (A-H):
//  A:id  B:date  C:sku  D:productName  E:qty
//  F:sellPrice  G:costPrice  H:profit
// ============================================================

const PRODUCTS_RANGE = `${CONFIG.PRODUCTS_SHEET}!A:X`; // อ่านถึง X (X=isNew) — การเขียนทั้งแถวยังจำกัด A:V
const SALES_RANGE    = `${CONFIG.SALES_SHEET}!A:H`;
const GEMS_RANGE     = `${CONFIG.GEMS_SHEET}!A:P`;

// ─── PRODUCTS ──────────────────────────────────────────────

async function sheetsGetAllProducts() {
  const resp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SHEET_ID,
    range: PRODUCTS_RANGE
  });
  const rows = resp.result.values || [];
  if (rows.length <= 1) return []; // header only
  return rows.slice(1).map(rowToProduct);
}

function rowToProduct(r) {
  return {
    id:         r[0]  || '',
    sku:        r[1]  || '',
    name:       r[2]  || '',
    category:   r[3]  || '',
    material:   r[4]  || '',
    weight:     r[5]  || '',
    gemType:    r[6]  || '-',
    gemWeight:  r[7]  || '-',
    costPrice:  Number(r[8]  || 0),
    sellPrice:  Number(r[9]  || 0),
    stock:      Number(r[10] || 0),
    status:     r[11] || 'พร้อมขาย',
    imageUrl:   r[12] || '',
    notes:      r[13] || '-',
    createdAt:  r[14] || '',
    size:       r[15] || '',
    highlight:  r[16] || '',
    postStatus: r[17] || '',
    videoUrl:   r[18] || '',
    promoPrice: Number(r[19] || 0),
    image2:     r[20] || '',
    image3:     r[21] || '',
    isNew:      (r[23] || '').trim().toUpperCase() === 'Y'
  };
}

function productToRow(p) {
  return [
    p.id, p.sku, p.name, p.category, p.material, p.weight,
    p.gemType, p.gemWeight, p.costPrice, p.sellPrice,
    p.stock, p.status, p.imageUrl, p.notes, p.createdAt,
    p.size || '', p.highlight || '', p.postStatus || '', p.videoUrl || '',
    p.promoPrice || '', p.image2 || '', p.image3 || ''
  ];
}

// สร้างสินค้าใหม่
async function sheetsAddProduct(product) {
  // สร้าง header ถ้ายังไม่มี
  await ensureProductsHeader();

  const row = productToRow(product);
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: CONFIG.SHEET_ID,
    range: `${CONFIG.PRODUCTS_SHEET}!A:A`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [row] }
  });
}

// อัปเดตสินค้าตาม SKU (ค้นหา row แล้ว update)
async function sheetsUpdateProduct(product) {
  const rowNum = await findProductRow(product.sku);
  if (!rowNum) throw new Error(`ไม่พบ SKU: ${product.sku}`);
  const range = `${CONFIG.PRODUCTS_SHEET}!A${rowNum}:V${rowNum}`;
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: CONFIG.SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [productToRow(product)] }
  });
}

// อัปเดตเฉพาะ stock + status
async function sheetsUpdateStock(sku, newStock) {
  const rowNum = await findProductRow(sku);
  if (!rowNum) throw new Error(`ไม่พบ SKU: ${sku}`);
  const status = newStock <= 0 ? 'หมดสต็อก' : 'พร้อมขาย';
  const range = `${CONFIG.PRODUCTS_SHEET}!K${rowNum}:L${rowNum}`;
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: CONFIG.SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [[newStock, status]] }
  });
}

// ลบสินค้า (ล้างแถว)
async function sheetsDeleteProduct(sku) {
  const rowNum = await findProductRow(sku);
  if (!rowNum) throw new Error(`ไม่พบ SKU: ${sku}`);
  // ล้างข้อมูลในแถว (ไม่ลบแถวจริง เพื่อรักษา row index)
  const range = `${CONFIG.PRODUCTS_SHEET}!A${rowNum}:V${rowNum}`;
  await gapi.client.sheets.spreadsheets.values.clear({
    spreadsheetId: CONFIG.SHEET_ID,
    range
  });
}

// หาเลขแถวของ sku (row 1 = header, ข้อมูลเริ่ม row 2)
async function findProductRow(sku) {
  const resp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SHEET_ID,
    range: `${CONFIG.PRODUCTS_SHEET}!B:B`
  });
  const skus = (resp.result.values || []);
  for (let i = 1; i < skus.length; i++) {
    if (skus[i][0] === sku) return i + 1; // +1 เพราะ Sheets เริ่มที่ 1
  }
  return null;
}

async function ensureProductsHeader() {
  const resp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SHEET_ID,
    range: `${CONFIG.PRODUCTS_SHEET}!A1:V1`
  });
  if (!resp.result.values || resp.result.values.length === 0) {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.SHEET_ID,
      range: `${CONFIG.PRODUCTS_SHEET}!A1:V1`,
      valueInputOption: 'RAW',
      resource: {
        values: [[
          'id','sku','name','category','material','weight',
          'gemType','gemWeight','costPrice','sellPrice',
          'stock','status','imageUrl','notes','createdAt','size',
          'highlight','postStatus','videoUrl','promoPrice',
          'imageUrl2','imageUrl3'
        ]]
      }
    });
  }
}

// ─── NEW ARRIVAL (คอลัมน์ X = isNew) ───────────────────────
// เขียนเฉพาะช่อง X — ห้ามรวมใน productToRow/A:V (จะทับ W consignment เก่า)
async function sheetsSetNewFlag(sku, isNew) {
  const rowNum = await findProductRow(sku);
  if (!rowNum) throw new Error(`ไม่พบ SKU: ${sku}`);
  await ensureIsNewHeader();
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: CONFIG.SHEET_ID,
    range: `${CONFIG.PRODUCTS_SHEET}!X${rowNum}`,
    valueInputOption: 'RAW',
    resource: { values: [[isNew ? 'Y' : '']] }
  });
}

async function ensureIsNewHeader() {
  const resp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SHEET_ID,
    range: `${CONFIG.PRODUCTS_SHEET}!X1`
  });
  const v = resp.result.values;
  if (!v || !v[0] || !v[0][0]) {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.SHEET_ID,
      range: `${CONFIG.PRODUCTS_SHEET}!X1`,
      valueInputOption: 'RAW',
      resource: { values: [['isNew']] }
    });
  }
}

// ─── SALES ─────────────────────────────────────────────────

async function sheetsGetAllSales() {
  const resp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SHEET_ID,
    range: SALES_RANGE
  });
  const rows = resp.result.values || [];
  if (rows.length <= 1) return [];
  return rows.slice(1).map(rowToSale);
}

function rowToSale(r) {
  return {
    id:          r[0] || '',
    date:        r[1] || '',
    sku:         r[2] || '',
    productName: r[3] || '',
    qty:         Number(r[4] || 1),
    sellPrice:   Number(r[5] || 0),
    costPrice:   Number(r[6] || 0),
    profit:      Number(r[7] || 0)
  };
}

async function sheetsAddSale(sale) {
  await ensureSalesHeader();
  const row = [
    sale.id, sale.date, sale.sku, sale.productName,
    sale.qty, sale.sellPrice, sale.costPrice, sale.profit
  ];
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: CONFIG.SHEET_ID,
    range: `${CONFIG.SALES_SHEET}!A:A`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [row] }
  });
}

async function ensureSalesHeader() {
  const resp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SHEET_ID,
    range: `${CONFIG.SALES_SHEET}!A1:H1`
  });
  if (!resp.result.values || resp.result.values.length === 0) {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.SHEET_ID,
      range: `${CONFIG.SALES_SHEET}!A1:H1`,
      valueInputOption: 'RAW',
      resource: {
        values: [['id','date','sku','productName','qty','sellPrice','costPrice','profit']]
      }
    });
  }
}

// ─── GEMS ──────────────────────────────────────────────────
//  Gems Sheet columns (A-P):
//  A:id  B:code  C:gemType  D:weight(ct)  E:shape
//  F:size(mm)  G:pricePerCt  H:stock(ชุด)  I:status  J:notes
//  K:createdAt  L:imageUrl  M:origin  N:pieces(เม็ด/ชุด)  O:videoUrl  P:promoPrice

async function sheetsGetAllGems() {
  await ensureGemsHeader();
  const resp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SHEET_ID,
    range: GEMS_RANGE
  });
  const rows = resp.result.values || [];
  if (rows.length <= 1) return [];
  return rows.slice(1).filter(r => r[1]).map(rowToGem);
}

function rowToGem(r) {
  return {
    id:         r[0]  || '',
    code:       r[1]  || '',
    gemType:    r[2]  || '',
    weight:     Number(r[3] || 0),
    shape:      r[4]  || '-',
    size:       r[5]  || '-',
    pricePerCt: Number(r[6] || 0),
    stock:      Number(r[7] || 0),
    status:     r[8]  || 'พร้อมขาย',
    notes:      r[9]  || '-',
    createdAt:  r[10] || '',
    imageUrl:   r[11] || '',
    origin:     r[12] || '-',
    pieces:     Number(r[13] || 1),
    videoUrl:   r[14] || '',
    promoPrice: Number(r[15] || 0)
  };
}

function gemToRow(g) {
  return [
    g.id, g.code, g.gemType, g.weight, g.shape,
    g.size || '-', g.pricePerCt, g.stock, g.status,
    g.notes || '-', g.createdAt,
    g.imageUrl || '', g.origin || '-',
    (g.pieces != null ? g.pieces : 1), g.videoUrl || '',
    g.promoPrice || ''
  ];
}

async function sheetsAddGem(gem) {
  await ensureGemsHeader();
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: CONFIG.SHEET_ID,
    range: `${CONFIG.GEMS_SHEET}!A:A`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [gemToRow(gem)] }
  });
}

async function sheetsUpdateGem(gem) {
  const rowNum = await findGemRow(gem.code);
  if (!rowNum) throw new Error(`ไม่พบรหัส: ${gem.code}`);
  const range = `${CONFIG.GEMS_SHEET}!A${rowNum}:P${rowNum}`;
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: CONFIG.SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [gemToRow(gem)] }
  });
}

async function sheetsUpdateGemStock(code, newStock) {
  const rowNum = await findGemRow(code);
  if (!rowNum) throw new Error(`ไม่พบรหัส: ${code}`);
  const status = newStock <= 0 ? 'หมดสต็อก' : 'พร้อมขาย';
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: CONFIG.SHEET_ID,
    range: `${CONFIG.GEMS_SHEET}!H${rowNum}:I${rowNum}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [[newStock, status]] }
  });
}

async function findGemRow(code) {
  const resp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SHEET_ID,
    range: `${CONFIG.GEMS_SHEET}!B:B`
  });
  const codes = resp.result.values || [];
  for (let i = 1; i < codes.length; i++) {
    if (codes[i][0] === code) return i + 1;
  }
  return null;
}

async function ensureGemsHeader() {
  // ลอง GET ก่อน — ถ้า 400 แสดงว่า sheet tab ยังไม่มี ต้องสร้างก่อน
  let needHeader = false;
  try {
    const resp = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SHEET_ID,
      range: `${CONFIG.GEMS_SHEET}!A1:O1`
    });
    if (!resp.result.values || resp.result.values.length === 0) {
      needHeader = true;
    }
  } catch (e) {
    // sheet tab ไม่มี → สร้างใหม่
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: CONFIG.SHEET_ID,
      resource: {
        requests: [{
          addSheet: { properties: { title: CONFIG.GEMS_SHEET } }
        }]
      }
    });
    needHeader = true;
  }
  if (needHeader) {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.SHEET_ID,
      range: `${CONFIG.GEMS_SHEET}!A1:P1`,
      valueInputOption: 'RAW',
      resource: {
        values: [['id','code','gemType','weight','shape','size','pricePerCt','stock','status','notes','createdAt','imageUrl','origin','pieces','videoUrl','promoPrice']]
      }
    });
  }
}

async function generateGemCode() {
  const gems = await sheetsGetAllGems();
  const existing = gems
    .map(g => g.code)
    .filter(c => c.startsWith('PL-'))
    .map(c => parseInt(c.replace('PL-', '')) || 0);
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return `PL-${String(max + 1).padStart(3, '0')}`;
}

// ─── HELPERS ───────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function todayISO() {
  return new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
}

// สร้าง SKU อัตโนมัติตามประเภท
async function generateSku(category) {
  const prefixMap = {
    'แหวน': 'SR', 'ต่างหู': 'SE', 'จี้': 'SP',
    'กำไล': 'SG', 'สร้อยข้อมือ': 'SB', 'สร้อยคอ': 'SN'
  };
  const prefix = prefixMap[category] || 'SX';
  const products = await sheetsGetAllProducts();
  const existing = products
    .map(p => p.sku)
    .filter(s => s.startsWith(prefix))
    .map(s => parseInt(s.replace(prefix + '-', '')) || 0);
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}
