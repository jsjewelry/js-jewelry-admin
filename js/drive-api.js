// drive-api.js — อัปโหลดรูปสินค้าขึ้น Google Drive

async function driveUploadImage(file, sku) {
  if (!file) return '';
  const filename = `${sku}_${Date.now()}.${file.name.split('.').pop()}`;
  const metadata = { name: filename, parents: [CONFIG.DRIVE_FOLDER_ID] };
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;
  const base64 = await fileToBase64(file);
  const base64Data = base64.split(',')[1];
  const multipartBody = delimiter + 'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) + delimiter + `Content-Type: ${file.type}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n' + base64Data + closeDelim;
  const response = await gapi.client.request({
    path: 'https://www.googleapis.com/upload/drive/v3/files',
    method: 'POST',
    params: { uploadType: 'multipart', fields: 'id,name,webContentLink,webViewLink' },
    headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
    body: multipartBody
  });
  const fileId = response.result.id;
  await driveSetPublic(fileId);
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
}

async function driveDeleteImage(imageUrl) {
  if (!imageUrl || !imageUrl.includes('drive.google.com')) return;
  const match = imageUrl.match(/[?&]id=([^&]+)/);
  if (!match) return;
  const fileId = match[1];
  try {
    await gapi.client.request({ path: `https://www.googleapis.com/drive/v3/files/${fileId}`, method: 'DELETE' });
  } catch (e) { console.warn('ลบรูปไม่ได้:', e); }
}

async function driveSetPublic(fileId) {
  await gapi.client.request({
    path: `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    method: 'POST',
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    headers: { 'Content-Type': 'application/json' }
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(file, maxPx = 900, quality = 0.85) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxPx || h > maxPx) {
          if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
          else { w = Math.round(w * maxPx / h); h = maxPx; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}