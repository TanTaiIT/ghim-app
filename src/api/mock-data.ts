import type { Group, GroupMember, HelpTopic, ListingDetail, Person, Seller } from './client';
import { ART, zoom } from './mock-art';

/*
 * Dữ liệu mẫu lấy theo nội dung bộ UI gốc. Thời gian tính lùi từ lúc nạp module để "15 phút trước"
 * trên thẻ vẫn đúng nghĩa khi mở app ngày nào cũng được.
 */

const MIN = 60_000;
const LOADED_AT = Date.now();
const ago = (minutes: number) => new Date(LOADED_AT - minutes * MIN).toISOString();

const HCM = 'TP.HCM';

/* ─── NGƯỜI ───────────────────────────────────────────────────────── */

const ME_ID = 'u-me';

const person = (id: string, name: string, verified: boolean): Person => ({ id, name, verified });

const anhTuan: Seller = {
  ...person('u-anh-tuan', 'Anh Tuấn Tech', true),
  rating: 4.9,
  deals: 38,
  replyMinutes: 10,
  phone: '0909123456',
  joinedAt: null,
};
const minhThu = person('u-minh-thu', 'Minh Thư', false);
const hoangLong = person('u-hoang-long', 'Hoàng Long', true);
const kimNgan = person('u-kim-ngan', 'Kim Ngân', true);
const quocBao = person('u-quoc-bao', 'Quốc Bảo', false);
const thanhHa = person('u-thanh-ha', 'Thanh Hà', true);
const minhKhoa = person('u-minh-khoa', 'Minh Khoa', true);
const baoNgoc = person('u-bao-ngoc', 'Bảo Ngọc', false);
const ducHuy = person('u-duc-huy', 'Đức Huy', true);
const me = person(ME_ID, 'Nguyễn Văn Tài', true);

/** Người bán không có hồ sơ đầy đủ trong dữ liệu mẫu — điền số liệu trung tính. */
const asSeller = (p: Person): Seller => ({
  ...p,
  rating: 4.7,
  deals: 6,
  replyMinutes: 30,
  phone: null,
  joinedAt: null,
});

/* ─── TIN ĐĂNG ────────────────────────────────────────────────────── */

/** Tên danh mục cho nhãn của tin mẫu (tin trong nhóm, tin đã lưu) — danh mục thật đọc từ server. */
const CATEGORY_NAME = {
  phone: 'Điện thoại',
  laptop: 'Laptop',
  fashion: 'Thời trang',
  furniture: 'Nội thất',
  vehicle: 'Xe cộ',
  camera: 'Máy ảnh',
  electronics: 'Đồ điện tử',
};

type Seed = Pick<ListingDetail, 'id' | 'title' | 'price' | 'cover' | 'condition'> &
  Partial<Omit<ListingDetail, 'category' | 'seller'>> & {
    categoryId: keyof typeof CATEGORY_NAME;
    minutesAgo: number;
    ward: string;
    sellerOf: Person | Seller;
  };

function listing(s: Seed): ListingDetail {
  const { categoryId, minutesAgo, ward, sellerOf, ...rest } = s;
  return {
    place: { ward, province: HCM },
    postedAt: ago(minutesAgo),
    boosted: false,
    groupName: null,
    category: { id: categoryId, name: CATEGORY_NAME[categoryId] },
    brand: null,
    photos: [s.cover],
    specs: [],
    description: '',
    views: 24,
    allowOffers: true,
    ...rest,
    seller: 'rating' in sellerOf ? sellerOf : asSeller(sellerOf),
  };
}

const NA = 'Hội Nhiếp ảnh Sài Gòn';

const mba = ART.macbookAirM1;

export const LISTINGS: ListingDetail[] = [
  listing({
    id: 'l-ip13pro',
    title: 'iPhone 13 Pro 256GB xanh Sierra',
    price: 14_500_000,
    cover: { svg: ART.iphone13ProBlue },
    condition: 'like-new',
    minutesAgo: 10,
    ward: 'Quận 1',
    sellerOf: anhTuan,
    boosted: true,
    categoryId: 'phone',
    brand: 'Apple',
    specs: [
      { label: 'Bộ nhớ', value: '256GB' },
      { label: 'Pin', value: '88%' },
    ],
    description: 'Máy zin, chưa thay linh kiện. Face ID nhạy, có hộp và cáp.',
  }),
  listing({
    id: 'l-mba-m1',
    title: 'MacBook Air M1 2020 8GB / 256GB',
    price: 13_900_000,
    cover: { svg: mba },
    condition: 'like-new',
    minutesAgo: 120,
    ward: 'Thủ Đức',
    sellerOf: anhTuan,
    boosted: true,
    categoryId: 'laptop',
    brand: 'Apple',
    // Sáu ảnh như gallery gốc ("1 / 6"): ảnh toàn cảnh rồi các góc cận cắt từ cùng một tranh.
    photos: [
      { svg: mba },
      { svg: zoom(mba, '143 71 210 210') },
      { svg: zoom(mba, '60 200 160 160') },
      { svg: zoom(mba, '180 200 160 160') },
      { svg: zoom(mba, '70 70 260 260') },
      { svg: zoom(mba, '100 120 200 200') },
    ],
    specs: [
      { label: 'Chip', value: 'Apple M1' },
      { label: 'RAM', value: '8GB' },
      { label: 'Ổ cứng', value: '256GB SSD' },
      { label: 'Pin', value: '92%' },
      { label: 'Màu sắc', value: 'Xám' },
      { label: 'Bảo hành', value: 'Test 7 ngày' },
    ],
    description:
      'Máy nguyên bản, chưa qua sửa chữa. Pin 92%, sạc zin đi kèm. Ngoại hình đẹp, không trầy cấn. Bao test 7 ngày, xem máy trực tiếp tại Thủ Đức.',
    views: 142,
  }),
  listing({
    id: 'l-sony',
    categoryId: 'electronics',
    title: 'Tai nghe Sony WH-1000XM4',
    price: 3_800_000,
    cover: { svg: ART.headphones },
    condition: 'like-new',
    minutesAgo: 60 * 26,
    ward: 'Quận 3',
    sellerOf: me,
    boosted: true,
    views: 142,
  }),
  listing({
    id: 'l-vision',
    title: 'Honda Vision 2021 chính chủ',
    price: 24_000_000,
    cover: { svg: ART.scooter },
    condition: 'used',
    minutesAgo: 15,
    ward: 'Quận 7',
    sellerOf: quocBao,
    categoryId: 'vehicle',
    brand: 'Honda',
    groupName: 'Xe máy cũ Quận 7',
  }),
  listing({
    id: 'l-desk',
    title: 'Bàn học gỗ sồi còn mới',
    price: 450_000,
    cover: { svg: ART.desk },
    condition: 'like-new',
    minutesAgo: 60,
    ward: 'Bình Thạnh',
    sellerOf: me,
    categoryId: 'furniture',
    views: 58,
  }),
  listing({
    id: 'l-xt30',
    categoryId: 'camera',
    title: 'Máy ảnh Fujifilm X-T30 + lens kit 15-45',
    price: 12_500_000,
    cover: { svg: ART.camera },
    condition: 'used',
    minutesAgo: 180,
    ward: 'Quận 10',
    sellerOf: minhKhoa,
    groupName: NA,
    brand: 'Fujifilm',
    specs: [{ label: 'Số shot', value: '8.200' }],
  }),
  listing({
    id: 'l-canon50',
    categoryId: 'camera',
    title: 'Canon 50mm f/1.8 STM',
    price: 2_100_000,
    cover: { svg: ART.lens },
    condition: 'like-new',
    minutesAgo: 300,
    ward: 'Quận 5',
    sellerOf: baoNgoc,
    groupName: NA,
    brand: 'Canon',
  }),
  listing({
    id: 'l-tripod',
    categoryId: 'camera',
    title: 'Chân máy Benro du lịch',
    price: 1_350_000,
    cover: { svg: ART.tripod },
    condition: 'used',
    minutesAgo: 60 * 26,
    ward: 'Phú Nhuận',
    sellerOf: ducHuy,
    groupName: NA,
  }),
  listing({
    id: 'l-ip13pink',
    title: 'iPhone 13 128GB hồng, pin 89%',
    price: 10_200_000,
    cover: { svg: ART.iphone13Pink },
    condition: 'used',
    minutesAgo: 60,
    ward: 'Gò Vấp',
    sellerOf: minhThu,
    categoryId: 'phone',
    brand: 'Apple',
  }),
  listing({
    id: 'l-ip13mini',
    title: 'iPhone 13 mini 256GB đen',
    price: 11_000_000,
    cover: { svg: ART.iphone13MiniBlack },
    condition: 'like-new',
    minutesAgo: 120,
    ward: 'Quận 3',
    sellerOf: hoangLong,
    categoryId: 'phone',
    brand: 'Apple',
  }),
  listing({
    id: 'l-ip13pm',
    title: 'iPhone 13 Pro Max 128GB vàng',
    price: 17_800_000,
    cover: { svg: ART.iphone13ProMaxGold },
    condition: 'like-new',
    minutesAgo: 180,
    ward: 'Thủ Đức',
    sellerOf: kimNgan,
    boosted: true,
    categoryId: 'phone',
    brand: 'Apple',
  }),
  listing({
    id: 'l-ip13white',
    title: 'iPhone 13 256GB trắng, fullbox',
    price: 12_300_000,
    cover: { svg: ART.iphone13White },
    condition: 'new',
    minutesAgo: 300,
    ward: 'Tân Bình',
    sellerOf: quocBao,
    categoryId: 'phone',
    brand: 'Apple',
  }),
  listing({
    id: 'l-ip13blue',
    title: 'iPhone 13 128GB xanh dương',
    price: 10_500_000,
    cover: { svg: ART.iphone13Blue },
    condition: 'used',
    minutesAgo: 60 * 26,
    ward: 'Quận 7',
    sellerOf: thanhHa,
    categoryId: 'phone',
    brand: 'Apple',
  }),
  listing({
    id: 'l-mba16',
    title: 'MacBook Air M1 16GB/512GB',
    price: 17_500_000,
    cover: { svg: ART.macbookAirM1Teal },
    condition: 'like-new',
    minutesAgo: 240,
    ward: 'Quận 1',
    sellerOf: kimNgan,
    categoryId: 'laptop',
    brand: 'Apple',
  }),
  listing({
    id: 'l-mbp-m1',
    title: 'MacBook Pro M1 13 inch',
    price: 18_200_000,
    cover: { svg: ART.macbookProM1 },
    condition: 'used',
    minutesAgo: 400,
    ward: 'Quận 3',
    sellerOf: hoangLong,
    categoryId: 'laptop',
    brand: 'Apple',
  }),
  listing({
    id: 'l-mba-m2',
    title: 'MacBook Air M2 8GB/256GB',
    price: 19_900_000,
    cover: { svg: ART.macbookAirM2 },
    condition: 'new',
    minutesAgo: 600,
    ward: 'Tân Bình',
    sellerOf: thanhHa,
    categoryId: 'laptop',
    brand: 'Apple',
  }),
];

export const SAVED_IDS = ['l-ip13pro', 'l-mba16', 'l-xt30'];

/* ─── NHÓM ────────────────────────────────────────────────────────── */

export const GROUPS: Group[] = [
  {
    id: 'g-na',
    name: NA,
    initials: 'NA',
    visibility: 'public',
    memberCount: 12_400,
    joined: true,
    cover: { svg: ART.skyline },
    pinnedRule: 'Chỉ đăng máy ảnh, ống kính và phụ kiện. Ghi rõ số shot và tình trạng máy.',
    about:
      'Nơi anh em mê ảnh ở Sài Gòn mua bán, trao đổi máy ảnh, ống kính và phụ kiện. Gặp mặt xem máy trực tiếp, không đặt cọc trước.',
  },
  {
    id: 'g-hv',
    name: 'THPT Hùng Vương',
    initials: 'HV',
    visibility: 'private',
    memberCount: 860,
    joined: true,
    cover: { svg: ART.skyline },
    pinnedRule: null,
    about:
      'Nhóm của cựu học sinh và phụ huynh THPT Hùng Vương: sách vở, đồng phục, đồ dùng học tập.',
  },
  {
    id: 'g-xm',
    name: 'Xe máy cũ Quận 7',
    initials: 'XM',
    visibility: 'public',
    memberCount: 3_200,
    joined: true,
    cover: { svg: ART.skyline },
    pinnedRule: 'Đăng xe phải có ảnh giấy tờ (che số khung, số máy).',
    about: 'Mua bán xe máy cũ khu vực Quận 7 và lân cận.',
  },
];

export const GROUP_MEMBERS: GroupMember[] = [
  { ...person('u-na-admin', 'Lê Quang Vinh', true), role: 'admin' },
  { ...minhKhoa, role: 'member' },
  { ...baoNgoc, role: 'member' },
  { ...ducHuy, role: 'member' },
  { ...me, role: 'member' },
];

/* ─── TRỢ GIÚP ──────────────────────────────────────────────── */

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'post',
    label: 'Đăng tin',
    faqs: [
      {
        q: 'Làm sao để đăng tin?',
        a: 'Bấm nút + ở giữa thanh điều hướng, thêm ảnh, nhập tiêu đề, giá và mô tả rồi bấm Đăng tin. Tin hiển thị sau khi được duyệt.',
      },
      {
        q: 'Vì sao tin chưa được duyệt?',
        a: 'Tin có thể bị từ chối nếu thiếu ảnh thật, sai danh mục hoặc vi phạm quy chế. Bạn sẽ nhận thông báo kèm lý do để chỉnh sửa.',
      },
    ],
  },
  {
    id: 'boost',
    label: 'Đẩy tin & gói',
    faqs: [
      {
        q: 'Đẩy tin là gì?',
        a: 'Đẩy tin đưa tin của bạn lên nhóm đầu kết quả tìm kiếm trong một khoảng thời gian. Chọn ở bước cuối khi đăng tin hoặc nút Đẩy tin trong trang Cá nhân.',
      },
      {
        q: 'Tin hết hạn thì làm sao?',
        a: 'Tin hết hạn sẽ ngừng hiển thị. Bạn có thể gia hạn trong Cá nhân › Đang đăng.',
      },
    ],
  },
  {
    id: 'account',
    label: 'Tài khoản & xác minh',
    faqs: [
      {
        q: 'Làm sao để có tích xanh?',
        a: 'Vào Cá nhân › Xác minh tài khoản và làm theo hướng dẫn xác minh CCCD.',
      },
      {
        q: 'Quên mật khẩu?',
        a: 'Ở màn hình đăng nhập, chọn Quên mật khẩu và nhập email để nhận mã đặt lại.',
      },
    ],
  },
  {
    id: 'scam',
    label: 'Báo cáo lừa đảo',
    faqs: [
      {
        q: 'Nhận biết lừa đảo thế nào?',
        a: 'Cẩn thận khi bị đòi đặt cọc trước, giá rẻ bất thường hoặc bị rủ chuyển sang ứng dụng khác. Admin không bao giờ yêu cầu chuyển khoản qua tin nhắn.',
      },
      {
        q: 'Báo cáo một tin đăng?',
        a: 'Mở tin đăng, bấm biểu tượng lá cờ ở góc trên và chọn lý do. Đội kiểm duyệt sẽ xem xét.',
      },
    ],
  },
];
