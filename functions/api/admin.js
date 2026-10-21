// Cloudflare Pages Function: POST /api/admin  { op, ... }  -> mọi thao tác quản trị (cần header x-admin-key = biến ADMIN_KEY)
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
const arr = s => { try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const str = v => (v === undefined || v === null ? null : String(v));
// Tự thêm cột "colors" (màu sắc) cho bảng products nếu database cũ chưa có
let colorsOk = false;
async function ensureColors(db) {
  if (colorsOk) return;
  const cols = (await db.prepare('PRAGMA table_info(products)').all()).results || [];
  if (!cols.some(c => c.name === 'colors')) await db.prepare("ALTER TABLE products ADD COLUMN colors TEXT DEFAULT '[]'").run();
  colorsOk = true;
}

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

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return J({ error: 'Chỉ nhận POST' }, 405);
  const db = env.DB;
  if (!db) return J({ error: 'Chưa gắn D1 vào project Pages (tên biến phải là DB)' }, 500);
  if (!(await validToken(env, request.headers.get('x-admin-key')))) return J({ error: 'Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập' }, 401);
  let b = {}; try { b = await request.json(); } catch (e) {}

  try {
    switch (b.op) {
      case 'auth.check': return J({ ok: true });
      case 'settings.save':
        await db.prepare("INSERT INTO site_settings(id,data,updated_at) VALUES('main',?1,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET data=?1,updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(b.data || {})).run();
        return J({ ok: true });
      case 'category.add': {
        const r = await db.prepare('INSERT INTO categories(name,parent_id,level) VALUES(?,?,?)').bind(str(b.name), b.parent_id || null, b.level || 1).run();
        return J({ id: r.meta.last_row_id });
      }
      case 'category.update': {
        const f = b.fields || {}, set = [], val = [];
        for (const k of ['name', 'parent_id', 'level']) if (k in f) { set.push(k + '=?'); val.push(f[k] === '' ? null : f[k]); }
        if (set.length) await db.prepare(`UPDATE categories SET ${set.join(',')} WHERE id=?`).bind(...val, b.id).run();
        return J({ ok: true });
      }
      case 'category.del':
        await db.prepare('DELETE FROM categories WHERE id=?').bind(b.id).run(); return J({ ok: true });
      case 'product.add': {
        await ensureColors(db);
        let imgs = Array.isArray(b.images) ? b.images : [];
        const main = b.main_image || b.image_url || imgs[0] || null;
        if (!imgs.length && main) imgs = [main];
        const r = await db.prepare('INSERT INTO products(name,price,old_price,category_id,image_url,main_image,images,sizes,colors,description) VALUES(?,?,?,?,?,?,?,?,?,?)')
          .bind(str(b.name), Number(b.price) || 0, b.old_price ?? null, b.category_id || null, main, main, JSON.stringify(imgs), JSON.stringify(b.sizes || []), JSON.stringify(b.colors || []), str(b.description)).run();
        return J({ id: r.meta.last_row_id });
      }
      case 'product.update': {
        await ensureColors(db);
        const f = b.fields || {}, set = [], val = [];
        for (const k of ['name', 'price', 'old_price', 'category_id', 'main_image', 'image_url', 'description']) if (k in f) { set.push(k + '=?'); val.push(f[k]); }
        for (const k of ['images', 'sizes', 'colors']) if (k in f) { set.push(k + '=?'); val.push(JSON.stringify(f[k] || [])); }
        if (set.length) await db.prepare(`UPDATE products SET ${set.join(',')} WHERE id=?`).bind(...val, b.id).run();
        return J({ ok: true });
      }
      case 'product.del':
        await db.prepare('DELETE FROM products WHERE id=?').bind(b.id).run(); return J({ ok: true });
      case 'orders.list':
        return J((await db.prepare('SELECT * FROM orders ORDER BY id DESC').all()).results.map(o => ({ ...o, cart_items: arr(o.cart_items) })));
      case 'order.del':
        await db.prepare('DELETE FROM orders WHERE id=?').bind(b.id).run(); return J({ ok: true });
      case 'media.list': {   // thư viện ảnh: liệt kê toàn bộ ảnh trên kho ảnh
        if (!env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) return J({ error: 'Chưa cài khóa dịch vụ lưu ảnh trên Cloudflare (2 biến *_API_KEY và *_API_SECRET), rồi deploy lại' }, 500);
        const q = new URLSearchParams({ max_results: '60' }); if (b.cursor) q.set('next_cursor', b.cursor);
        const r = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD || 'yxjghz1b'}/resources/image?${q}`, { headers: { Authorization: 'Basic ' + btoa(env.CLOUDINARY_API_KEY + ':' + env.CLOUDINARY_API_SECRET) } });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) return J({ error: (j.error && j.error.message) || ('Dịch vụ lưu ảnh báo lỗi ' + r.status) }, 502);
        return J({ resources: (j.resources || []).map(x => ({ public_id: x.public_id, secure_url: x.secure_url, bytes: x.bytes, width: x.width, height: x.height, created_at: x.created_at })), next_cursor: j.next_cursor || null });
      }
      case 'media.del': {   // xóa vĩnh viễn nhiều ảnh trên kho ảnh
        if (!env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) return J({ error: 'Chưa cài khóa dịch vụ lưu ảnh trên Cloudflare (2 biến *_API_KEY và *_API_SECRET), rồi deploy lại' }, 500);
        const ids = (Array.isArray(b.ids) ? b.ids : []).filter(x => typeof x === 'string' && x && !x.includes('..')).slice(0, 100);
        if (!ids.length) return J({ deleted: 0 });
        const q = new URLSearchParams(); ids.forEach(i => q.append('public_ids[]', i)); q.set('invalidate', 'true');
        const r = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD || 'yxjghz1b'}/resources/image/upload?${q}`, { method: 'DELETE', headers: { Authorization: 'Basic ' + btoa(env.CLOUDINARY_API_KEY + ':' + env.CLOUDINARY_API_SECRET) } });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) return J({ error: (j.error && j.error.message) || ('Dịch vụ lưu ảnh báo lỗi ' + r.status) }, 502);
        return J({ deleted: Object.values(j.deleted || {}).filter(v => v === 'deleted').length });
      }
      default: return J({ error: 'Thao tác không hợp lệ' }, 400);
    }
  } catch (e) { return J({ error: 'Lỗi máy chủ: ' + e.message }, 500); }
}
