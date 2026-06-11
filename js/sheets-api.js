// ============================================================
//  sheets-api.js — Google Sheets CRUD
//  Products Sheet columns (A-O):
//  A:id  B:sku  C:name  D:category  E:material  F:weight
//  G:gemType  H:gemWeight  I:costPrice  J:sellPrice
//  K:stock  L:status  M:imageUrl  N:notes  O:createdAt
//
//  Sales Sheet columns (A-H):
//  A:id  B:date  C:sku  D:productName  E:qty
//  F:sellPrice  G:costPrice  H:profit
// ============================================================

const PRODUCTS_RANGE = `${CONFIG.PRODUCTS_SHEET}!A:P`;
const SALES_RANGE = `${CONFIG.SALES_SHEET}!A:H`;

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
    size:       r[15] || ''
  };
}

function productToRow(p) {
  return [
    p.id, p.sku, p.name, p.category, p.material, p.weight,
    p.gemType, p.gemWeight, p.costPrice, p.sellPrice,
    p.stock, p.status, p.imageUrl, p.notes, p.createdAt,
    p.size || ''
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
  const range = `${CONFIG.PRODUCTS_SHEET}!A${rowNum}:P${rowNum}`;
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
  const range = `${CONFIG.PRODUCTS_SHEET}!A${rowNum}:O${rowNum}`;
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
    range: `${CONFIG.PRODUCTS_SHEET}!A1:O1`
  });
  if (!resp.result.values || resp.result.values.length === 0) {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.SHEET_ID,
      range: `${CONFIG.PRODUCTS_SHEET}!A1:P1`,
      valueInputOption: 'RAW',
      resource: {
        values: [[
          'id','sku','name','category','material','weight',
          'gemType','gemWeight','costPrice','sellPrice',
          'stock','status','imageUrl','notes','createdAt','size'
        ]]
      }
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
