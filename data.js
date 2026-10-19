// Cloudflare Pages Function: /api/data
//   GET  /api/data?t=settings | categories | products | ping   -> đọc dữ liệu công khai (và tự kiểm tra)
//   POST /api/data                                             -> khách đặt hàng
// Cần gắn D1 vào project Pages với tên biến "DB".
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
const arr = s => { try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const str = v => (v === undefined || v === null ? null : String(v));

export async function onRequest({ request, env }) {
  const m = request.method, db = env.DB, t = new URL(request.url).searchParams.get('t');
  if (m === 'OPTIONS') return new Response(null, { status: 204 });
  if (t === 'ping') return J({ ok: true, d1: !!db, adminKeySet: !!env.ADMIN_KEY });
  if (!db) return J({ error: 'Chưa gắn D1 vào project Pages (tên biến phải là DB)' }, 500);
  try {
    if (m === 'GET') {
      if (t === 'settings') { const r = await db.prepare("SELECT data FROM site_settings WHERE id='main'").first(); return J({ data: r ? JSON.parse(r.data) : null }); }
      if (t === 'categories') return J((await db.prepare('SELECT * FROM categories ORDER BY id').all()).results);
      if (t === 'products') return J((await db.prepare('SELECT * FROM products ORDER BY id DESC').all()).results.map(r => ({ ...r, images: arr(r.images), sizes: arr(r.sizes) })));
      return J({ error: 'Thiếu tham số t' }, 400);
    }
    if (m === 'POST') {   // khách đặt hàng
      let b = {}; try { b = await request.json(); } catch (e) {}
      const name = str(b.customer_name), phone = str(b.customer_phone), addr = str(b.address);
      if (!name || !phone || !addr || !Array.isArray(b.cart_items) || !b.cart_items.length) return J({ error: 'Thiếu thông tin đơn hàng' }, 400);
      const items = JSON.stringify(b.cart_items);
      if (items.length > 40000 || name.length > 200 || addr.length > 500) return J({ error: 'Dữ liệu đơn hàng quá lớn' }, 400);
      const r = await db.prepare('INSERT INTO orders(customer_name,customer_phone,address,note,total_amount,cart_items) VALUES(?,?,?,?,?,?)')
        .bind(name, phone, addr, str(b.note), Number(b.total_amount) || 0, items).run();
      return J({ id: r.meta.last_row_id });
    }
    return J({ error: 'Phương thức không hỗ trợ' }, 405);
  } catch (e) { return J({ error: 'Lỗi máy chủ: ' + e.message }, 500); }
}
