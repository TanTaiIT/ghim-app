import type { HelpTopic } from './client';

/* Chủ đề trợ giúp — server chưa có nội dung trợ giúp. */

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
    id: 'warning',
    label: 'Cảnh cáo & khiếu nại',
    faqs: [
      {
        q: 'Cảnh cáo là gì?',
        a: 'Cảnh cáo được ghi khi tin hoặc tài khoản của bạn vi phạm quy định sàn. Người duyệt ghi, kèm điều quy định bị vi phạm; máy không bao giờ tự ghi cảnh cáo. Bị từ chối vì sai sót (thiếu ảnh, sai danh mục…) thì không phải cảnh cáo.',
      },
      {
        q: 'Cảnh cáo ảnh hưởng gì tới tôi?',
        a: 'Mỗi cảnh cáo có điểm vi phạm: cảnh cáo 1 điểm, cảnh cáo nặng 2 điểm. Khi còn điểm, tin mới chỉ hiển thị hạn chế; đủ 3 điểm thì tạm dừng đăng tin mới cho tới khi điểm giảm. Thông báo cảnh cáo cho biết con số đang áp dụng.',
      },
      {
        q: 'Bao lâu thì cảnh cáo hết?',
        a: 'Cảnh cáo tự hết hạn — thường 90 ngày, cảnh cáo nặng 180 ngày. Hết hạn thì điểm tự giảm và hạn chế tự gỡ. Ngày hết hạn có trong thông báo cảnh cáo.',
      },
      {
        q: 'Không đồng ý thì sao?',
        a: 'Mỗi cảnh cáo được khiếu nại một lần, trong 14 ngày kể từ khi nhận. Một người khác người đã ghi cảnh cáo sẽ xét lại; được chấp nhận thì cảnh cáo được xoá và tin bị gỡ được khôi phục.',
      },
      {
        q: 'Vi phạm nghiêm trọng là gì?',
        a: 'Hàng cấm hoặc lừa đảo đã xác nhận. Tài khoản bị khoá ngay và chờ quản trị viên quyết; khiếu nại qua đội hỗ trợ trong 30 ngày.',
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
