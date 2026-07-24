// drive-api.js — อัปโหลดรูปสินค้าขึ้น Google Drive

async function driveUploadImage(file, sku) {
  if (!file) return '';
  const originalExt = (file.name.split('.').pop() || '').toLowerCase();
  const extension = file.type === 'image/jpeg' ? 'jpg' : (originalExt || 'jpg');
  const filename = `${sku}_${Date.now()}.${extension}`;
  const metadata = { name: filename, parents: [CONFIG.DRIVE_FOLDER_ID] };
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;
  const base64 = await fileToBase64(file);
  const base64Data = base64.split(',')[1];
  if (!base64Data) throw new Error('\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e40\u0e15\u0e23\u0e35\u0e22\u0e21\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e23\u0e39\u0e1b\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e2d\u0e31\u0e1b\u0e42\u0e2b\u0e25\u0e14\u0e44\u0e14\u0e49');
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
    reader.onerror = () => reject(new Error('\u0e2d\u0e48\u0e32\u0e19\u0e44\u0e1f\u0e25\u0e4c\u0e23\u0e39\u0e1b\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'));
    reader.onabort = () => reject(new Error('\u0e01\u0e32\u0e23\u0e2d\u0e48\u0e32\u0e19\u0e44\u0e1f\u0e25\u0e4c\u0e23\u0e39\u0e1b\u0e16\u0e39\u0e01\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01'));
    reader.readAsDataURL(file);
  });
}

function compressImage(file, maxPx = 900, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.size) {
      reject(new Error('\u0e44\u0e1f\u0e25\u0e4c\u0e23\u0e39\u0e1b\u0e27\u0e48\u0e32\u0e07\u0e2b\u0e23\u0e37\u0e2d\u0e2d\u0e48\u0e32\u0e19\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49'));
      return;
    }

    let objectUrl = URL.createObjectURL(file);
    const img = new Image();
    let settled = false;
    let usingDataUrlFallback = false;
    const timer = setTimeout(() => {
      fail(new Error('\u0e40\u0e15\u0e23\u0e35\u0e22\u0e21\u0e23\u0e39\u0e1b\u0e19\u0e32\u0e19\u0e40\u0e01\u0e34\u0e19 30 \u0e27\u0e34\u0e19\u0e32\u0e17\u0e35 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e23\u0e39\u0e1b\u0e43\u0e2b\u0e21\u0e48'));
    }, 30000);

    function cleanup() {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    }

    function fail(error) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    }

    img.onload = () => {
      try {
        let w = img.width, h = img.height;
        if (!w || !h) throw new Error('\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e19\u0e32\u0e14\u0e02\u0e2d\u0e07\u0e23\u0e39\u0e1b');
        if (w > maxPx || h > maxPx) {
          if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
          else { w = Math.round(w * maxPx / h); h = maxPx; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('\u0e2d\u0e38\u0e1b\u0e01\u0e23\u0e13\u0e4c\u0e19\u0e35\u0e49\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e1b\u0e23\u0e30\u0e21\u0e27\u0e25\u0e1c\u0e25\u0e23\u0e39\u0e1b\u0e44\u0e14\u0e49');
        ctx.drawImage(img, 0, 0, w, h);
        if (typeof canvas.toBlob !== 'function') {
          throw new Error('\u0e40\u0e1a\u0e23\u0e32\u0e27\u0e4c\u0e40\u0e0b\u0e2d\u0e23\u0e4c\u0e19\u0e35\u0e49\u0e44\u0e21\u0e48\u0e23\u0e2d\u0e07\u0e23\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e1a\u0e35\u0e1a\u0e2d\u0e31\u0e14\u0e23\u0e39\u0e1b');
        }
        canvas.toBlob(blob => {
          if (!blob || !blob.size) {
            fail(new Error('\u0e41\u0e1b\u0e25\u0e07\u0e23\u0e39\u0e1b\u0e40\u0e1b\u0e47\u0e19 JPEG \u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'));
            return;
          }
          if (settled) return;
          settled = true;
          cleanup();
          canvas.width = 1;
          canvas.height = 1;
          const baseName = (file.name || 'image').replace(/\.[^.]+$/, '') || 'image';
          resolve(new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: file.lastModified || Date.now()
          }));
        }, 'image/jpeg', quality);
      } catch (error) {
        fail(error);
      }
    };

    img.onerror = () => {
      if (!usingDataUrlFallback) {
        usingDataUrlFallback = true;
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        fileToBase64(file)
          .then(dataUrl => {
            if (!settled) img.src = dataUrl;
          })
          .catch(fail);
        return;
      }
      fail(new Error('\u0e40\u0e1a\u0e23\u0e32\u0e27\u0e4c\u0e40\u0e0b\u0e2d\u0e23\u0e4c\u0e2d\u0e48\u0e32\u0e19\u0e23\u0e39\u0e1b\u0e19\u0e35\u0e49\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e43\u0e0a\u0e49\u0e44\u0e1f\u0e25\u0e4c JPG \u0e2b\u0e23\u0e37\u0e2d PNG'));
    };
    img.src = objectUrl;
  });
}