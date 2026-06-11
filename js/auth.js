// ============================================================
//  auth.js — Google OAuth 2.0 (Google Identity Services)
// ============================================================

let tokenClient = null;
let accessToken = null;
let gapiReady = false;
let gisReady = false;

function gapiLoaded() {
  gapi.load('client', async () => {
    await gapi.client.init({});
    await gapi.client.load('https://sheets.googleapis.com/$discovery/rest?version=v4');
    gapiReady = true;
    maybeRender();
  });
}

function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: CONFIG.SCOPES,
    callback: handleTokenResponse
  });
  gisReady = true;
  maybeRender();
}

function maybeRender() {
  if (gapiReady && gisReady) {
    const saved = sessionStorage.getItem('gapi_token');
    if (saved) {
      const t = JSON.parse(saved);
      if (t.expires_at > Date.now()) {
        accessToken = t.access_token;
        gapi.client.setToken({ access_token: accessToken });
        showApp();
        return;
      }
    }
    showLogin();
  }
}

function handleTokenResponse(resp) {
  if (resp.error) { console.error('Auth error:', resp); showToast('เข้าสู่ระบบไม่สำเร็จ: ' + resp.error, 'error'); return; }
  accessToken = resp.access_token;
  gapi.client.setToken({ access_token: accessToken });
  const expires_at = Date.now() + (resp.expires_in - 60) * 1000;
  sessionStorage.setItem('gapi_token', JSON.stringify({ access_token: accessToken, expires_at }));
  showApp();
}

function signIn() { if (!tokenClient) return; tokenClient.requestAccessToken({ prompt: '' }); }

function signOut() {
  if (accessToken) { google.accounts.oauth2.revoke(accessToken); accessToken = null; }
  gapi.client.setToken(null);
  sessionStorage.removeItem('gapi_token');
  showLogin();
}

function isSignedIn() { return !!accessToken; }

function showApp() {
  document.getElementById('login-screen')?.style && (document.getElementById('login-screen').style.display = 'none');
  document.getElementById('app-screen')?.style && (document.getElementById('app-screen').style.display = 'block');
  if (typeof onAppReady === 'function') onAppReady();
}

function showLogin() {
  document.getElementById('login-screen')?.style && (document.getElementById('login-screen').style.display = 'flex');
  document.getElementById('app-screen')?.style && (document.getElementById('app-screen').style.display = 'none');
}