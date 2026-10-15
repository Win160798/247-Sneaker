/* ===== Cấu hình dùng chung cho index.html và admin.html ===== */
const SUPABASE_URL = 'https://uleckabliwereivgxryo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZWNrYWJsaXdlcmVpdmd4cnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MzI1NTUsImV4cCI6MjEwNjMwODU1NX0.Sa5fY_OceWa7TI9yqBSMLM24ZTEN6g10j4RrXvENs3o';

// Cloudinary: tải ảnh bằng "Unsigned upload preset" (KHÔNG dùng API secret trên web)
const CLOUD_NAME = 'yxjghz1b';
const UPLOAD_PRESET = 'sneaker247';
const WATERMARK = '247.Sneaker';

const clone = o => JSON.parse(JSON.stringify(o));
function merge(a, b) {
  if (b === undefined || b === null) return clone(a);
  if (Array.isArray(a) || typeof a !== 'object' || a === null) return b;
  const o = {};
  for (const k in a) o[k] = merge(a[k], b[k]);
  for (const k in b) if (!(k in a)) o[k] = b[k];
  return o;
}

const G = ['img/sn1.jpg', 'img/sn2.jpg', 'img/sn3.jpg'];
const gm = u => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(u);

const DEFAULTS = {
  title: '247 Sneaker',
  favicon: 'img/logo.jpg',
  brand: '247 SNEAKER',
  c: { bg: '#8AA9E2', card: '#D9D5D1', ink: '#111111' },
  font: { h: 'Lexend Giga:wght@600', b: 'Lexend:wght@300;400;600', n: 'Arima:wght@700' },
  nav: [
    { t: 'TRANG CHỦ', u: 'home' },
    { t: 'SẢN PHẨM', u: 'products' },
    { t: 'HƯỚNG DẪN CHỌN SIZE', u: 'size' },
    { t: 'LIÊN HỆ', u: 'contact' }
  ],
  hero: ['img/hero1.jpg', 'img/hero2.jpg', 'img/hero3.jpg'],
  big: 'SNEAKER',
  gal: [...G],
  gal2: [...G],
  prodTitle: 'danh sách sản phẩm',
  sizeTitle: 'đo từ đỉnh ngón cái\nđến gót chân',
  sizeHead: ['SIZE NAM', 'SIZE NỮ', 'KÍCH THƯỚC', 'SIZE'],
  sizeM: [['22cm', 38], ['22.5 cm', 39], ['23 cm', 40], ['23.5 cm', 41], ['24 cm', 42], ['24.5 cm', 43], ['25 cm', 44]].map(([k, s]) => ({ k, s: String(s) })),
  sizeF: [['21 cm', 36], ['21.5 cm', 37], ['22cm', 38], ['22.5 cm', 39], ['23 cm', 40], ['23.5 cm', 41], ['24 cm', 42]].map(([k, s]) => ({ k, s: String(s) })),
  storeTitle: 'hệ thống cửa hàng',
  homeIcon: 'img/home.png',
  stores: [
    { img: 'img/map1.jpg', addr: '23 Đinh Châu - Cẩm Lệ - Đà Nẵng', link: gm('23 Đinh Châu, Cẩm Lệ, Đà Nẵng') },
    { img: 'img/map2.jpg', addr: '16 Mai Đăng Chơn - Ngũ Hành Sơn - Đà Nẵng', link: gm('16 Mai Đăng Chơn, Ngũ Hành Sơn, Đà Nẵng') }
  ],
  logo: 'img/logo.jpg',
  contacts: [
    { icon: 'img/zalo.png', text: '0777.87.3464', link: 'https://zalo.me/0777873464' },
    { icon: 'img/instagram.png', text: '247.sneaker', link: 'https://instagram.com/247.sneaker' },
    { icon: 'img/tiktok.png', text: '247.sneaker', link: 'https://tiktok.com/@247.sneaker' },
    { icon: 'img/facebook.png', text: '247.sneaker', link: 'https://facebook.com/247.sneaker' }
  ],
  follow: 'Theo dõi ngay MXH của 247 Sneaker để không bỏ lỡ các mẫu hot trend mới nhất nhé!',
  pages: {
    home: 'hero,gal,prod,gal2,stores,contact',
    products: 'prod,gal2,stores,contact',
    size: 'hero,size,stores,contact',
    contact: 'hero,contact,stores'
  }
};
