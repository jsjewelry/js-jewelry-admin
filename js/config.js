// ============================================================
//  config.js — JS Jewelry Admin
//  แก้ค่าด้านล่างหลังตั้งค่า Google Cloud + Sheet + Drive
// ============================================================

const CONFIG = {
  CLIENT_ID: '725893335045-4mhpfppohrm2tg7guaq3c1q7no3dlaki.apps.googleusercontent.com',
  SHEET_ID: '1Tk53rhDhYRxTkGpXvbd55hMYlTJ83stwG0H3yoZrMDo',
  DRIVE_FOLDER_ID: '1EcVhw1jEvzrgLJyIcSfKFX8pFCsJwm3-',
  PRODUCTS_SHEET: 'Products',
  SALES_SHEET: 'Sales',
  GEMS_SHEET: 'Gems',
  SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
  ].join(' ')
};