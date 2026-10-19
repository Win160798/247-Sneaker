// Cloudflare Pages Function: toàn bộ API dữ liệu của shop, lưu trong D1.
// Cần: (1) gắn D1 vào project Pages với tên biến "DB", (2) biến môi trường ADMIN_KEY.
// Khách chỉ được: xem sản phẩm/danh mục/giao diện và ĐẶT HÀNG. Mọi thao tác ghi khác cần mã quản trị (header x-admin-key).

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
const arr = s => { try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const prod = r => ({ ...r, images: arr(r.images), sizes: arr(r.sizes) });
const str = v => (v === undefined || v === null ? null : String(v));

export async function onRequest({ request, env, params }) {
  const m = request.method;
  if (m === 'OPTIONS') return new Response(null, { status: 204 });
  const db = env.DB;
  const parts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean), res = parts[0], id = parts[1];

  if (res === 'ping') return J({ ok: true, d1: !!db, adminKeySet: !!env.ADMIN_KEY });   // dùng để tự kiểm tra: mở /api/ping
  if (!db) return J({ error: 'Chưa gắn D1 vào project Pages (tên biến phải là DB)' }, 500);

  const admin = !!env.ADMIN_KEY && request.headers.get('x-admin-key') === env.ADMIN_KEY;
  const deny = () => J({ error: 'Sai mã quản trị' }, 401);
  let body = {};
  if (m !== 'GET' && m !== 'DELETE') { try { body = await request.json(); } catch (e) {} }

  /* ---------- Các thao tác dùng chung ---------- */
  const A = {
    async setSettings(b) {
      await db.prepare("INSERT INTO site_settings(id,data,updated_at) VALUES('main',?1,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET data=?1,updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(b.data || {})).run();
      return { ok: true };
    },
    async addCategory(b) {
      const r = await db.prepare('INSERT INTO categories(name,parent_id,level) VALUES(?,?,?)').bind(str(b.name), b.parent_id || null, b.level || 1).run();
      return { id: r.meta.last_row_id };
    },
    async delCategory(i) { await db.prepare('DELETE FROM categories WHERE id=?').bind(i).run(); return { ok: true }; },
    async addProduct(b) {
      let imgs = Array.isArray(b.images) ? b.images : [];
      const main = b.main_image || b.image_url || imgs[0] || null;
      if (!imgs.length && main) imgs = [main];
      const r = await db.prepare('INSERT INTO products(name,price,old_price,category_id,image_url,main_image,images,sizes,description) VALUES(?,?,?,?,?,?,?,?,?)')
        .bind(str(b.name), Number(b.price) || 0, b.old_price ?? null, b.category_id || null, main, main, JSON.stringify(imgs), JSON.stringify(b.sizes || []), str(b.description)).run();
      return { id: r.meta.last_row_id };
    },
    async updateProduct(i, b) {
      const set = [], val = [];
      for (const k of ['name', 'price', 'old_price', 'category_id', 'main_image', 'image_url', 'description']) if (k in b) { set.push(k + '=?'); val.push(b[k]); }
      for (const k of ['images', 'sizes']) if (k in b) { set.push(k + '=?'); val.push(JSON.stringify(b[k] || [])); }
      if (set.length) await db.prepare(`UPDATE products SET ${set.join(',')} WHERE id=?`).bind(...val, i).run();
      return { ok: true };
    },
    async delProduct(i) { await db.prepare('DELETE FROM products WHERE id=?').bind(i).run(); return { ok: true }; },
    async listOrders() { return (await db.prepare('SELECT * FROM orders ORDER BY id DESC').all()).results.map(o => ({ ...o, cart_items: arr(o.cart_items) })); },
    async delOrder(i) { await db.prepare('DELETE FROM orders WHERE id=?').bind(i).run(); return { ok: true }; },
    async addOrder(b) {   // khách đặt hàng (không cần mã quản trị)
      const name = str(b.customer_name), phone = str(b.customer_phone), addr = str(b.address);
      if (!name || !phone || !addr || !Array.isArray(b.cart_items) || !b.cart_items.length) return { __err: 'Thiếu thông tin đơn hàng' };
      const items = JSON.stringify(b.cart_items);
      if (items.length > 40000 || name.length > 200 || addr.length > 500) return { __err: 'Dữ liệu đơn hàng quá lớn' };
      const r = await db.prepare('INSERT INTO orders(customer_name,customer_phone,address,note,total_amount,cart_items) VALUES(?,?,?,?,?,?)')
        .bind(name, phone, addr, str(b.note), Number(b.total_amount) || 0, items).run();
      return { id: r.meta.last_row_id };
    }
  };
  const out = r => (r && r.__err ? J({ error: r.__err }, 400) : J(r));

  try {
    /* ---------- Cổng quản trị: MỌI thao tác ghi đều đi qua POST /api/admin {op, ...} ---------- */
    if (res === 'admin' && m === 'POST') {
      if (!admin) return deny();
      switch (body.op) {
        case 'settings.save': return out(await A.setSettings(body));
        case 'category.add': return out(await A.addCategory(body));
        case 'category.del': return out(await A.delCategory(body.id));
        case 'product.add': return out(await A.addProduct(body));
        case 'product.update': return out(await A.updateProduct(body.id, body.fields || {}));
        case 'product.del': return out(await A.delProduct(body.id));
        case 'orders.list': return out(await A.listOrders());
        case 'order.del': return out(await A.delOrder(body.id));
        default: return J({ error: 'Thao tác không hợp lệ' }, 400);
      }
    }

    /* ---------- Khách đặt hàng ---------- */
    if ((res === 'order' || res === 'orders') && m === 'POST') return out(await A.addOrder(body));

    /* ---------- Đọc dữ liệu công khai ---------- */
    if (m === 'GET') {
      if (res === 'settings') { const r = await db.prepare("SELECT data FROM site_settings WHERE id='main'").first(); return J({ data: r ? JSON.parse(r.data) : null }); }
      if (res === 'categories') return J((await db.prepare('SELECT * FROM categories ORDER BY id').all()).results);
      if (res === 'products') return J((await db.prepare('SELECT * FROM products ORDER BY id DESC').all()).results.map(prod));
    }

    /* ---------- Kiểu REST cũ (giữ để tương thích) ---------- */
    if (admin) {
      if (res === 'settings' && m === 'PUT') return out(await A.setSettings(body));
      if (res === 'categories' && m === 'POST') return out(await A.addCategory(body));
      if (res === 'categories' && m === 'DELETE' && id) return out(await A.delCategory(id));
      if (res === 'products' && m === 'POST') return out(await A.addProduct(body));
      if (res === 'products' && m === 'PATCH' && id) return out(await A.updateProduct(id, body));
      if (res === 'products' && m === 'DELETE' && id) return out(await A.delProduct(id));
      if (res === 'orders' && m === 'GET') return out(await A.listOrders());
      if (res === 'orders' && m === 'DELETE' && id) return out(await A.delOrder(id));
    } else if (['settings', 'categories', 'products', 'orders'].includes(res) && m !== 'GET') return deny();

    return J({ error: 'Không tìm thấy' }, 404);
  } catch (e) {
    return J({ error: 'Lỗi máy chủ: ' + e.message }, 500);
  }
}
