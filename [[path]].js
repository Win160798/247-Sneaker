// Cloudflare Pages Function: toàn bộ API dữ liệu của shop (thay cho Supabase), lưu trong D1.
// Cần: (1) gắn D1 vào project Pages với tên biến "DB", (2) biến môi trường ADMIN_KEY.
// Khách chỉ được: xem sản phẩm/danh mục/giao diện và ĐẶT HÀNG. Mọi thao tác ghi khác cần mã quản trị (header x-admin-key).

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
const arr = s => { try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const prod = r => ({ ...r, images: arr(r.images), sizes: arr(r.sizes) });
const str = v => (v === undefined || v === null ? null : String(v));

export async function onRequest({ request, env, params }) {
  // Xử lý CORS Preflight để không bị lỗi 405 khi gọi API
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS', 
        'Access-Control-Allow-Headers': 'content-type, x-admin-key' 
      } 
    });
  }

  const db = env.DB;
  if (!db) return J({ error: 'Chưa gắn D1 vào project Pages (tên biến phải là DB)' }, 500);

  const parts = (params.path || []), res = parts[0], id = parts[1], m = request.method;
  const admin = !!env.ADMIN_KEY && request.headers.get('x-admin-key') === env.ADMIN_KEY;
  const deny = () => J({ error: 'Sai mã quản trị' }, 401);
  let body = {};
  if (m !== 'GET' && m !== 'DELETE') { try { body = await request.json(); } catch (e) {} }

  try {
    /* ---------- Giao diện website ---------- */
    if (res === 'settings') {
      if (m === 'GET') {
        const r = await db.prepare("SELECT data FROM site_settings WHERE id='main'").first();
        return J({ data: r ? JSON.parse(r.data) : null });
      }
      if (m === 'PUT') {
        if (!admin) return deny();
        await db.prepare("INSERT INTO site_settings(id,data,updated_at) VALUES('main',?1,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET data=?1,updated_at=CURRENT_TIMESTAMP")
          .bind(JSON.stringify(body.data || {})).run();
        return J({ ok: true });
      }
    }

    /* ---------- Danh mục ---------- */
    if (res === 'categories') {
      if (m === 'GET') return J((await db.prepare('SELECT * FROM categories ORDER BY id').all()).results);
      if (!admin) return deny();
      if (m === 'POST') {
        const r = await db.prepare('INSERT INTO categories(name,parent_id,level) VALUES(?,?,?)').bind(str(body.name), body.parent_id || null, body.level || 1).run();
        return J({ id: r.meta.last_row_id });
      }
      if (m === 'DELETE' && id) { await db.prepare('DELETE FROM categories WHERE id=?').bind(id).run(); return J({ ok: true }); }
    }

    /* ---------- Sản phẩm ---------- */
    if (res === 'products') {
      if (m === 'GET') return J((await db.prepare('SELECT * FROM products ORDER BY id DESC').all()).results.map(prod));
      if (!admin) return deny();
      if (m === 'POST') {
        let imgs = Array.isArray(body.images) ? body.images : [];
        const main = body.main_image || body.image_url || imgs[0] || null;
        if (!imgs.length && main) imgs = [main];
        const r = await db.prepare('INSERT INTO products(name,price,old_price,category_id,image_url,main_image,images,sizes,description) VALUES(?,?,?,?,?,?,?,?,?)')
          .bind(str(body.name), Number(body.price) || 0, body.old_price ?? null, body.category_id || null, main, main, JSON.stringify(imgs), JSON.stringify(body.sizes || []), str(body.description)).run();
        return J({ id: r.meta.last_row_id });
      }
      if (m === 'PATCH' && id) {
        const set = [], val = [];
        for (const k of ['name', 'price', 'old_price', 'category_id', 'main_image', 'image_url', 'description']) if (k in body) { set.push(k + '=?'); val.push(body[k]); }
        for (const k of ['images', 'sizes']) if (k in body) { set.push(k + '=?'); val.push(JSON.stringify(body[k] || [])); }
        if (!set.length) return J({ ok: true });
        await db.prepare(`UPDATE products SET ${set.join(',')} WHERE id=?`).bind(...val, id).run();
        return J({ ok: true });
      }
      if (m === 'DELETE' && id) { await db.prepare('DELETE FROM products WHERE id=?').bind(id).run(); return J({ ok: true }); }
    }

    /* ---------- Đơn hàng ---------- */
    if (res === 'orders') {
      if (m === 'POST') {   // khách đặt hàng (không cần mã quản trị)
        const name = str(body.customer_name), phone = str(body.customer_phone), addr = str(body.address);
        if (!name || !phone || !addr || !Array.isArray(body.cart_items) || !body.cart_items.length) return J({ error: 'Thiếu thông tin đơn hàng' }, 400);
        const items = JSON.stringify(body.cart_items);
        if (items.length > 40000 || name.length > 200 || addr.length > 500) return J({ error: 'Dữ liệu đơn hàng quá lớn' }, 400);
        const r = await db.prepare('INSERT INTO orders(customer_name,customer_phone,address,note,total_amount,cart_items) VALUES(?,?,?,?,?,?)')
          .bind(name, phone, addr, str(body.note), Number(body.total_amount) || 0, items).run();
        return J({ id: r.meta.last_row_id });
      }
      if (!admin) return deny();
      if (m === 'GET') return J((await db.prepare('SELECT * FROM orders ORDER BY id DESC').all()).results.map(o => ({ ...o, cart_items: arr(o.cart_items) })));
      if (m === 'DELETE' && id) { await db.prepare('DELETE FROM orders WHERE id=?').bind(id).run(); return J({ ok: true }); }
    }

    return J({ error: 'Không tìm thấy' }, 404);
  } catch (e) {
    return J({ error: 'Lỗi máy chủ: ' + e.message }, 500);
  }
}
