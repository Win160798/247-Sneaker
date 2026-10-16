/* ===== Cấu hình dùng chung cho index.html và admin.html (cần nạp assets.js trước file này) ===== */
const SUPABASE_URL = 'https://uleckabliwereivgxryo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZWNrYWJsaXdlcmVpdmd4cnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MzI1NTUsImV4cCI6MjEwNjMwODU1NX0.Sa5fY_OceWa7TI9yqBSMLM24ZTEN6g10j4RrXvENs3o';

// Cloudinary: tải ảnh bằng "Unsigned upload preset" (KHÔNG để API secret trong code web)
const CLOUD_NAME = 'yxjghz1b';
const UPLOAD_PRESET = '247_sneaker';
const WATERMARK = '247.Sneaker';

const clone = o => JSON.parse(JSON.stringify(o));
const gp = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const sp = (o, p, v) => { const k = p.split('.'), l = k.pop(); k.reduce((a, x) => a[x], o)[l] = v; };
function merge(a, b) {
  if (b === undefined || b === null) return clone(a);
  if (Array.isArray(a) || typeof a !== 'object' || a === null) return b;
  const o = {};
  for (const k in a) o[k] = merge(a[k], b[k]);
  for (const k in b) if (!(k in a)) o[k] = b[k];
  return o;
}
const fam = x => String(x || '').split(':')[0];

// Font có tiếng Việt (chọn trong trình chỉnh; có thể gõ thêm tên Google Font bất kỳ)
const FONTS = ['Arial', 'Lexend:wght@300;400;600;700', 'Lexend Giga:wght@400;600', 'Arima:wght@400;700', 'Montserrat:wght@400;700', 'Be Vietnam Pro:wght@400;700',
  'Roboto:wght@400;700', 'Inter:wght@400;700', 'Poppins:wght@400;700', 'Nunito:wght@400;700', 'Quicksand:wght@400;700', 'Raleway:wght@400;700', 'Open Sans:wght@400;700',
  'Lato:wght@400;700', 'Barlow:wght@400;700', 'Sora:wght@400;700', 'Space Grotesk:wght@400;700', 'Josefin Sans:wght@400;700', 'Comfortaa:wght@400;700', 'Baloo 2:wght@400;700',
  'Oswald:wght@400;700', 'Anton', 'Archivo Black', 'Saira:wght@400;700', 'Exo 2:wght@400;700', 'Playfair Display:wght@400;700', 'Merriweather:wght@400;700',
  'Cormorant Garamond:wght@400;700', 'Noto Serif:wght@400;700', 'Dancing Script:wght@400;700', 'Pacifico', 'Lobster', 'Patrick Hand'];

const gm = u => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(u);

// Ảnh mặc định ghi dạng "def:tên" (ảnh thật nằm trong assets.js) để dữ liệu lưu lên Supabase gọn nhẹ
const DEFAULTS = {
  title: '247 Sneaker',
  favicon: 'def:logo',
  brand: '247 SNEAKER',
  c: { bg: '#8AA9E2', card: '#D9D5D1', ink: '#111111' },
  font: { h: 'Lexend Giga:wght@400;600', b: 'Lexend:wght@300;400;600;700', n: 'Arima:wght@400;700' },
  nav: [
    { t: 'TRANG CHỦ', u: 'home' },
    { t: 'SẢN PHẨM', u: 'products' },
    { t: 'HƯỚNG DẪN CHỌN SIZE', u: 'size' },
    { t: 'LIÊN HỆ', u: 'contact' }
  ],
  hero: ['def:hero1', 'def:hero2', 'def:hero3'],
  big: 'SNEAKER',
  gal: ['def:sn1', 'def:sn2', 'def:sn3'],
  gal2: ['def:sn1', 'def:sn2', 'def:sn3'],
  prodTitle: 'DANH SÁCH SẢN PHẨM',
  sizeTitle: 'ĐO TỪ ĐỈNH NGÓN CÁI\nĐẾN GÓT CHÂN',
  sizeHead: ['SIZE NAM', 'SIZE NỮ', 'KÍCH THƯỚC', 'SIZE'],
  sizeM: [['22cm', 38], ['22.5 cm', 39], ['23 cm', 40], ['23.5 cm', 41], ['24 cm', 42], ['24.5 cm', 43], ['25 cm', 44]].map(([k, s]) => ({ k, s: String(s) })),
  sizeF: [['21 cm', 36], ['21.5 cm', 37], ['22cm', 38], ['22.5 cm', 39], ['23 cm', 40], ['23.5 cm', 41], ['24 cm', 42]].map(([k, s]) => ({ k, s: String(s) })),
  storeTitle: 'HỆ THỐNG CỬA HÀNG',
  homeIcon: 'def:home',
  // addr = chữ hiển thị | q = địa chỉ/từ khóa hiện Google Maps (hoặc dán link nhúng) | link = link khi bấm vào địa chỉ
  stores: [
    { addr: '23 Đinh Châu - Cẩm Lệ - Đà Nẵng', q: '23 Đinh Châu, Cẩm Lệ, Đà Nẵng', link: gm('23 Đinh Châu, Cẩm Lệ, Đà Nẵng') },
    { addr: '16 Mai Đăng Chơn - Ngũ Hành Sơn - Đà Nẵng', q: '16 Mai Đăng Chơn, Ngũ Hành Sơn, Đà Nẵng', link: gm('16 Mai Đăng Chơn, Ngũ Hành Sơn, Đà Nẵng') }
  ],
  logo: 'def:logo',
  contacts: [
    { icon: 'def:zalo', text: '0777.87.3464', link: 'https://zalo.me/0777873464' },
    { icon: 'def:instagram', text: '247.sneaker', link: 'https://instagram.com/247.sneaker' },
    { icon: 'def:tiktok', text: '247.sneaker', link: 'https://tiktok.com/@247.sneaker' },
    { icon: 'def:facebook', text: '247.sneaker', link: 'https://facebook.com/247.sneaker' }
  ],
  follow: 'Theo dõi ngay MXH của 247 Sneaker để không bỏ lỡ các mẫu hot trend mới nhất nhé!',
  zalo: { link: 'https://zalo.me/0777873464', icon: 'def:zalo' },
  pages: {
    home: 'hero,gal,prod,gal2,stores,contact',
    products: 'prod,gal2,stores,contact',
    size: 'hero,size,stores,contact',
    contact: 'hero,contact,stores'
  },
  // Kiểu chữ: khóa là đường dẫn chữ (VD "brand", "nav.0.t") hoặc "g:prodName" cho cả nhóm.
  // Giá trị: { ff: font, tt: 'uppercase'|'none', fw: 'bold'|'normal', fi: '1'|'0', fs: cỡ chữ, color: '#hex' }
  ts: {},
  sbg: {}   // màu nền từng khối: { hero: '#xxxxxx', ... }
};
