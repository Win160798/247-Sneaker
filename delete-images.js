// Cloudflare Pages Function: xóa vĩnh viễn 1 ảnh trên kho ảnh.
// Cần cài 3 biến môi trường trong Cloudflare Pages (Settings -> Variables and Secrets):
//   CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, ADMIN_KEY (mã bạn tự đặt để chỉ bạn xóa được ảnh)

// Kiểm tra "thẻ phiên" đăng nhập (do /api/login cấp, ký bằng ADMIN_KEY)
const _enc = new TextEncoder();
const _b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function validToken(env, tok) {
  const secret = env.SESSION_SECRET || env.ADMIN_KEY;
  if (!secret || !tok || typeof tok !== 'string') return false;
  const [p, s] = tok.split('.'); if (!p || !s) return false;
  const k = await crypto.subtle.importKey('raw', _enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const ok = _b64u(await crypto.subtle.sign('HMAC', k, _enc.encode(p)));
  if (ok.length !== s.length) return false;
  let d = 0; for (let i = 0; i < ok.length; i++) d |= ok.charCodeAt(i) ^ s.charCodeAt(i);
  if (d) return false;
  try { return JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/'))).exp > Date.now() / 1000; } catch (e) { return false; }
}

export async function onRequestPost({ request, env }) {
  const h = { 'content-type': 'application/json' };
  const out = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: h });

  if (!env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET || !env.ADMIN_KEY)
    return out({ error: 'Chưa cài biến môi trường trên Cloudflare' }, 500);
  if (!(await validToken(env, request.headers.get('x-admin-key'))))
    return out({ error: 'Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập' }, 401);

  let body = {};
  try { body = await request.json(); } catch (e) {}
  const pid = body.public_id || '';
  if (!pid || pid.includes('..')) return out({ error: 'public_id không hợp lệ' }, 400);

  const ts = Math.floor(Date.now() / 1000);
  const toSign = `invalidate=true&public_id=${pid}&timestamp=${ts}${env.CLOUDINARY_API_SECRET}`;
  const sig = [...new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(toSign)))]
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const fd = new FormData();
  fd.append('public_id', pid); fd.append('timestamp', ts); fd.append('invalidate', 'true');
  fd.append('api_key', env.CLOUDINARY_API_KEY); fd.append('signature', sig);

  const r = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD || 'yxjghz1b'}/image/destroy`, { method: 'POST', body: fd });
  return new Response(await r.text(), { status: r.status, headers: h });
}
