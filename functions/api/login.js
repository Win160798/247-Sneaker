// Cloudflare Pages Function: POST /api/login  { user, pass, remember }  ->  { token, exp }
// Cần 3 biến trong Cloudflare Pages (Settings -> Variables and Secrets, loại Secret):
//   ADMIN_USER = tên đăng nhập bạn tự đặt | ADMIN_PASS = mật khẩu bạn tự đặt | ADMIN_KEY = chuỗi bí mật dài để ký phiên đăng nhập
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha = async s => b64u(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
async function sign(secret, data) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}

export async function onRequestPost({ request, env }) {
  const secret = env.SESSION_SECRET || env.ADMIN_KEY;
  if (!env.ADMIN_USER || !env.ADMIN_PASS || !secret) return J({ error: 'Chưa cài ADMIN_USER, ADMIN_PASS và ADMIN_KEY trên Cloudflare (cài xong nhớ deploy lại)' }, 500);
  let b = {}; try { b = await request.json(); } catch (e) {}
  const ip = request.headers.get('cf-connecting-ip') || 'unknown', db = env.DB, now = Math.floor(Date.now() / 1000);

  // chống dò mật khẩu: sai quá 6 lần trong 15 phút thì tạm khóa theo địa chỉ IP
  if (db) {
    await db.prepare('CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT, ts INTEGER)').run();
    await db.prepare('DELETE FROM login_attempts WHERE ts < ?').bind(now - 86400).run();
    const c = await db.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND ts > ?').bind(ip, now - 900).first();
    if (c && c.n >= 6) return J({ error: 'Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.' }, 429);
  }

  const okU = same(await sha(String(b.user || '').trim()), await sha(String(env.ADMIN_USER).trim()));
  const okP = same(await sha(String(b.pass || '')), await sha(String(env.ADMIN_PASS)));
  if (!(okU && okP)) {
    if (db) await db.prepare('INSERT INTO login_attempts(ip, ts) VALUES(?, ?)').bind(ip, now).run();
    await new Promise(r => setTimeout(r, 600));
    return J({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, 401);
  }
  if (db) await db.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();

  const exp = now + (b.remember ? 30 * 86400 : 12 * 3600), p = b64u(enc.encode(JSON.stringify({ exp })));
  return J({ token: p + '.' + await sign(secret, p), exp });
}
export async function onRequest() { return J({ error: 'Chỉ nhận POST' }, 405); }
