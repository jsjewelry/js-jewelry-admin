// ============================================================
//  config.js — JS Jewelry Admin
//  แก้ค่าด้านล่างหลังตั้งค่า Google Cloud + Sheet + Drive
// ============================================================

const CONFIG = {
  // Google OAuth 2.0 Client ID (จาก Google Cloud Console)
  CLIENT_ID: '725893335045-4mhpfppohrm2tg7guaq3c1q7no3dlaki.apps.googleusercontent.com',

  // Google Sheets ID (จาก URL ของ Sheet)
  // https://docs.google.com/spreadsheets/d/<<SHEET_ID>>/edit
  SHEET_ID: '1Tk53rhDhYRxTkGpXvbd55hMYlTJ83stwG0H3yoZrMDo',

  // Google Drive Folder ID สำหรับเก็บรูปสินค้า
  // https://drive.google.com/drive/folders/<<FOLDER_ID>>
  DRIVE_FOLDER_ID: '1EcVhw1jEvzrgLJyIcSfKFX8pFCsJwm3-',

  // ชื่อ Sheet ใน Spreadsheet
  PRODUCTS_SHEET: 'Products',
  SALES_SHEET: 'Sales',
  GEMS_SHEET: 'Gems',

  // OAuth Scopes ที่ต้องการ
  SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
  ].join(' ')
};
