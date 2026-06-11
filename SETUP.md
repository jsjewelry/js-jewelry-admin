# คู่มือตั้งค่า JS Jewelry Admin

## ภาพรวม
ระบบนี้ใช้ **GitHub Pages** เป็น frontend + **Google Sheets** เป็นฐานข้อมูล + **Google Drive** เก็บรูปภาพ

---

## ขั้นตอนที่ 1 — สร้าง GitHub Repository

1. ไปที่ [github.com](https://github.com) → Sign in
2. คลิก **New repository**
3. ตั้งชื่อ: `js-jewelry-admin`
4. เลือก **Public** (ต้องเป็น Public ถึงจะใช้ GitHub Pages ฟรี)
5. คลิก **Create repository**
6. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น repo
7. ไปที่ **Settings → Pages → Source: main branch** → Save
8. รอ 1-2 นาที → URL จะเป็น `https://<username>.github.io/js-jewelry-admin/`

---

## ขั้นตอนที่ 2 — สร้าง Google Cloud Project

1. ไปที่ [console.cloud.google.com](https://console.cloud.google.com)
2. คลิก dropdown โปรเจกต์ → **New Project**
3. ตั้งชื่อ: `JS Jewelry Admin` → **Create**
4. รอสักครู่แล้ว Select โปรเจกต์นั้น

### เปิด API ที่ต้องใช้
5. ไปที่ **APIs & Services → Library**
6. ค้นหา **Google Sheets API** → Enable
7. ค้นหา **Google Drive API** → Enable

### สร้าง OAuth 2.0 Client ID
8. ไปที่ **APIs & Services → OAuth consent screen**
9. เลือก **External** → Create
10. กรอก App name: `JS Jewelry Admin`, User support email (ของคุณ)
11. Authorized domains: `github.io`
12. Save and continue (ข้ามหน้า Scopes และ Test users ได้)

13. ไปที่ **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
14. Application type: **Web application**
15. Name: `JS Jewelry Web`
16. Authorized JavaScript origins:
    ```
    https://<username>.github.io
    http://localhost:8080
    ```
    (แทน `<username>` ด้วยชื่อ GitHub ของคุณ)
17. คลิก **Create**
18. **คัดลอก Client ID** (รูปแบบ: `xxxxxxxxxx.apps.googleusercontent.com`)

---

## ขั้นตอนที่ 3 — สร้าง Google Sheet

1. ไปที่ [sheets.google.com](https://sheets.google.com) → สร้าง Spreadsheet ใหม่
2. ตั้งชื่อ: `JS Jewelry Database`
3. เปลี่ยนชื่อ Sheet1 เป็น **Products**
4. สร้าง Sheet ใหม่ชื่อ **Sales**
5. **คัดลอก Spreadsheet ID** จาก URL:
   ```
   https://docs.google.com/spreadsheets/d/<<COPY_THIS_PART>>/edit
   ```

> ไม่ต้องใส่ header เอง — ระบบจะสร้างให้อัตโนมัติเมื่อบันทึกสินค้าครั้งแรก

---

## ขั้นตอนที่ 4 — สร้าง Google Drive Folder

1. ไปที่ [drive.google.com](https://drive.google.com)
2. สร้างโฟลเดอร์ใหม่ชื่อ **product-images**
3. คลิกขวาที่โฟลเดอร์ → **Share** → เปลี่ยนเป็น **Anyone with the link** (Viewer)
4. **คัดลอก Folder ID** จาก URL:
   ```
   https://drive.google.com/drive/folders/<<COPY_THIS_PART>>
   ```

---

## ขั้นตอนที่ 5 — ใส่ค่าใน config.js

เปิดไฟล์ `js/config.js` แล้วแก้ค่า 3 บรรทัดนี้:

```javascript
CLIENT_ID: 'xxxxxxxxxx.apps.googleusercontent.com',  // จากขั้นตอน 2
SHEET_ID: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',  // จากขั้นตอน 3
DRIVE_FOLDER_ID: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',  // จากขั้นตอน 4
```

จากนั้น commit และ push ไฟล์นี้ขึ้น GitHub

---

## ขั้นตอนที่ 6 — ทดสอบระบบ

1. เปิด `https://<username>.github.io/js-jewelry-admin/`
2. คลิก **เข้าสู่ระบบด้วย Google**
3. อนุญาต permission (Sheets + Drive)
4. ทดสอบเพิ่มสินค้า — รูปจะขึ้น Drive, ข้อมูลจะขึ้น Sheet อัตโนมัติ

---

## โครงสร้างไฟล์

```
js-jewelry-admin/
├── index.html          ← Dashboard + สต็อก + บันทึกขาย + รายงาน
├── add-product.html    ← เพิ่ม/แก้ไขสินค้า + อัปโหลดรูป
├── js/
│   ├── config.js       ← ← ← แก้ค่าตรงนี้
│   ├── auth.js         ← Google OAuth 2.0
│   ├── sheets-api.js   ← อ่าน/เขียน Google Sheets
│   └── drive-api.js    ← อัปโหลดรูปไป Drive
└── SETUP.md            ← คู่มือนี้
```

---

## หมายเหตุสำคัญ

- **ครั้งแรกที่ใช้งาน** Google อาจแสดง "App not verified" → คลิก **Advanced → Go to JS Jewelry Admin**
- ถ้าต้องการให้คนอื่นใช้ระบบร่วมด้วย → ไปที่ OAuth consent screen → เพิ่ม Test users
- เมื่อพร้อม Production จริง → Publish app (ต้องผ่าน Google review ถ้า scope sensitive)
- Token หมดอายุเมื่อ **ปิดแท็บ** → ต้อง login ใหม่ (เพื่อความปลอดภัย)
