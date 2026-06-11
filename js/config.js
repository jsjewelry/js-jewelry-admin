// ============================================================
//  config.js — JS Jewelry Admin
// ============================================================
const CONFIG = {
  CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  SHEET_ID: 'YOUR_SHEET_ID',
  DRIVE_FOLDER_ID: 'YOUR_DRIVE_FOLDER_ID',
  PRODUCTS_SHEET: 'Products',
  SALES_SHEET: 'Sales',
  SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
  ].join(' ')
};