// Cloudflare Pages Function: POST /api/admin  { op, ... }  -> mọi thao tác quản trị (cần header x-admin-key = biến ADMIN_KEY)
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
const arr = s => { try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const str = v => (v === undefined || v === null ? null : String(v));

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return J({ error: 'Chỉ nhận POST' }, 405);
  const db = env.DB;
  if (!db) return J({ error: 'Chưa gắn D1 vào project Pages (tên biến phải là DB)' }, 500);
  if (!env.ADMIN_KEY || request.headers.get('x-admin-key') !== env.ADMIN_KEY) return J({ error: 'Sai mã quản trị' }, 401);
  let b = {}; try { b = await request.json(); } catch (e) {}

  try {
    switch (b.op) {
      case 'settings.save':
        await db.prepare("INSERT INTO site_settings(id,data,updated_at) VALUES('main',?1,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET data=?1,updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(b.data || {})).run();
        return J({ ok: true });
      case 'category.add': {
        const r = await db.prepare('INSERT INTO categories(name,parent_id,level) VALUES(?,?,?)').bind(str(b.name), b.parent_id || null, b.level || 1).run();
        return J({ id: r.meta.last_row_id });
      }
      case 'category.del':
        await db.prepare('DELETE FROM categories WHERE id=?').bind(b.id).run(); return J({ ok: true });
      case 'product.add': {
        let imgs = Array.isArray(b.images) ? b.images : [];
        const main = b.main_image || b.image_url || imgs[0] || null;
        if (!imgs.length && main) imgs = [main];
        const r = await db.prepare('INSERT INTO products(name,price,old_price,category_id,image_url,main_image,images,sizes,description) VALUES(?,?,?,?,?,?,?,?,?)')
          .bind(str(b.name), Number(b.price) || 0, b.old_price ?? null, b.category_id || null, main, main, JSON.stringify(imgs), JSON.stringify(b.sizes || []), str(b.description)).run();
        return J({ id: r.meta.last_row_id });
      }
      case 'product.update': {
        const f = b.fields || {}, set = [], val = [];
        for (const k of ['name', 'price', 'old_price', 'category_id', 'main_image', 'image_url', 'description']) if (k in f) { set.push(k + '=?'); val.push(f[k]); }
        for (const k of ['images', 'sizes']) if (k in f) { set.push(k + '=?'); val.push(JSON.stringify(f[k] || [])); }
        if (set.length) await db.prepare(`UPDATE products SET ${set.join(',')} WHERE id=?`).bind(...val, b.id).run();
        return J({ ok: true });
      }
      case 'product.del':
        await db.prepare('DELETE FROM products WHERE id=?').bind(b.id).run(); return J({ ok: true });
      case 'orders.list':
        return J((await db.prepare('SELECT * FROM orders ORDER BY id DESC').all()).results.map(o => ({ ...o, cart_items: arr(o.cart_items) })));
      case 'order.del':
        await db.prepare('DELETE FROM orders WHERE id=?').bind(b.id).run(); return J({ ok: true });
      default: return J({ error: 'Thao tác không hợp lệ' }, 400);
    }
  } catch (e) { return J({ error: 'Lỗi máy chủ: ' + e.message }, 500); }
}
