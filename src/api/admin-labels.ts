/*
 * Chữ cho nhật ký vận hành và việc nền. Server ghi mã — hành động `<phần>.<đối tượng>.<việc>` (vd
 * `identity.account.lock`), loại đối tượng (`account`), tên việc (`review.every-minute`) — đúng cho máy, khó đọc cho
 * người. Mã chưa có ở đây vẫn hiện nguyên mã để không mất dòng nào.
 */

const ACTION_LABEL: Record<string, string> = {
  'category.category.create': 'Tạo danh mục',
  'category.category.rename': 'Đổi tên danh mục',
  'category.category.enable': 'Bật danh mục',
  'category.category.disable': 'Tắt danh mục',
  'category.settings.change': 'Đổi cài đặt máy duyệt của danh mục',
  'category.template.save_draft': 'Lưu nháp mẫu thông tin',
  'category.template.publish': 'Phát hành mẫu thông tin',
  'category.template.discard_draft': 'Bỏ nháp mẫu thông tin',
  'group.group.create': 'Lập nhóm',
  'group.group.lock': 'Tạm khoá nhóm',
  'group.group.unlock': 'Mở khoá nhóm',
  'group.group.close': 'Đóng nhóm',
  'group.owner.offer': 'Giao chủ nhóm',
  'group.owner.cancel_offer': 'Huỷ lời giao chủ nhóm',
  'group.code.rotate': 'Đổi mã vào nhóm',
  'group.settings.update': 'Đổi cài đặt nhóm',
  'group.invitation.create': 'Mời vào nhóm',
  'group.invitation.revoke': 'Thu hồi lời mời vào nhóm',
  'group.member.ban': 'Cấm khỏi nhóm',
  'group.member.unban': 'Bỏ cấm khỏi nhóm',
  'group.member.remove': 'Gỡ thành viên khỏi nhóm',
  'group.member.set_unit': 'Đổi đơn vị của thành viên',
  'group.moderator.set': 'Giao vai điều hành viên',
  'group.moderator.dismiss': 'Bãi vai điều hành viên',
  'group.roster.add': 'Thêm vào danh sách lớp',
  'group.roster.remove': 'Bỏ khỏi danh sách lớp',
  'group.unit.create': 'Thêm đơn vị trong nhóm',
  'group.unit.rename': 'Đổi tên đơn vị trong nhóm',
  'group.unit.delete': 'Xoá đơn vị trong nhóm',
  'identity.account.lock': 'Khoá tài khoản',
  'identity.account.unlock': 'Mở khoá tài khoản',
  'identity.flag.clear': 'Gỡ đánh dấu thiết bị',
  'identity.id_verification.decide': 'Quyết hồ sơ xác minh giấy tờ',
  'identity.disposable_domain.add': 'Chặn miền email dùng một lần',
  'identity.disposable_domain.remove': 'Bỏ chặn miền email dùng một lần',
  'listing.badge.remove': 'Gỡ huy hiệu nhóm khỏi tin',
  'messaging.support.reply': 'Trả lời hội thoại hỗ trợ',
  'platform.config.change': 'Đổi bảng con số',
  'platform.help.create': 'Thêm chủ đề trợ giúp',
  'platform.help.update': 'Sửa chủ đề trợ giúp',
  'platform.help.delete': 'Xoá chủ đề trợ giúp',
  'platform.help.reorder': 'Sắp lại chủ đề trợ giúp',
  'platform.staff.grant': 'Gắn quyền staff',
  'platform.staff.revoke': 'Thu quyền staff',
  'platform.staff.restore': 'Khôi phục quyền staff',
  'screening.rule.change': 'Đổi luật máy duyệt',
  'screening.rule.override': 'Đặt luật riêng cho danh mục',
  'screening.rule.override_clear': 'Bỏ luật riêng của danh mục',
  'screening.band.change': 'Đổi ngưỡng điểm của danh mục',
  'screening.keywords.replace': 'Đổi từ khoá danh mục',
  'screening.phrase.create': 'Thêm cụm từ cấm',
  'screening.phrase.update': 'Sửa cụm từ cấm',
  'screening.phrase.activate': 'Bật cụm từ cấm',
  'screening.phrase.deactivate': 'Tắt cụm từ cấm',
  'screening.whitelist.add': 'Thêm ảnh vào danh sách trắng',
  'screening.whitelist.remove': 'Gỡ ảnh khỏi danh sách trắng',
  'trust.strike.amnesty': 'Ân xá cảnh cáo',
  'trust.strike.lift': 'Gỡ khoá vĩnh viễn',
};

const TARGET_LABEL: Record<string, string> = {
  account: 'Tài khoản',
  banned_phrase: 'Cụm từ cấm',
  category: 'Danh mục',
  config_version: 'Bảng con số, phiên bản',
  conversation: 'Hội thoại',
  disposable_domain: 'Miền',
  group: 'Nhóm',
  help_topic: 'Chủ đề trợ giúp',
  id_verification: 'Hồ sơ giấy tờ',
  image_whitelist: 'Ảnh danh sách trắng',
  listing: 'Tin',
  screening_rule: 'Luật',
  strike: 'Cảnh cáo',
};

const JOB_LABEL: Record<string, string> = {
  'group.expire-pending': 'Hết hạn đơn xin vào nhóm, lời mời',
  'group.ownerless-timeout': 'Đóng nhóm thiếu chủ quá hạn',
  'identity.purge-expired': 'Dọn phiên, mã hết hạn',
  'identity.purge-unverified': 'Xoá tài khoản đăng ký dở dang',
  'identity.refresh-disposable-domains': 'Cập nhật miền email dùng một lần',
  'identity.send-mail': 'Gửi email',
  'identity.send-notice': 'Gửi thư báo tài khoản',
  'listing.expire-due': 'Hết hạn tin tới hạn',
  'listing.remind-expiring': 'Nhắc tin sắp hết hạn',
  'media.purge-unconfirmed': 'Dọn ảnh chưa xác nhận',
  'media.reconcile': 'Đối chiếu kho ảnh',
  'media.reconcile-continue': 'Đối chiếu kho ảnh (lượt tiếp)',
  'notification.push': 'Đẩy thông báo lên điện thoại',
  'notification.push-receipts': 'Đọc biên nhận thông báo đẩy',
  'ops.purge-drafts': 'Dọn bản nháp quá hạn',
  'ops.retention': 'Dọn dữ liệu theo hạn lưu',
  'ops.retention-continue': 'Dọn dữ liệu theo hạn lưu (lượt tiếp)',
  'outbox.purge-published': 'Dọn sự kiện đã phát',
  'review.every-minute': 'Việc duyệt: mỗi phút (nhả việc quá hạn nhận)',
  'review.every-hour': 'Việc duyệt: mỗi giờ (nhắc quá hạn, chuyển bậc)',
  'review.weekly-postcheck': 'Hậu kiểm hằng tuần',
  'screening.check-image': 'Kiểm một ảnh',
  'screening.price-stats': 'Tính giá thường thấy theo danh mục',
  'screening.rescan-phrase': 'Quét lại tin theo cụm từ cấm mới bật',
  'screening.safety-net': 'Lưới an toàn của máy duyệt',
  'trust.expire-strikes': 'Hết hạn cảnh cáo',
  'trust.permanent-reviews': 'Xem lại khoá vĩnh viễn tới kỳ',
  'trust.recompute-daily': 'Tính lại mức tin cậy hằng ngày',
};

/** Chi tiết server ghi kèm (chỉ mã và số); khoá chưa có ở đây hiện nguyên. */
const DETAIL_LABEL: Record<string, string> = {
  accountId: 'tài khoản',
  categoryId: 'danh mục',
  cause: 'vì',
  categories: 'danh mục',
  draftVersion: 'bản nháp',
  fieldCount: 'số ô',
  keywords: 'số từ khoá',
  label: 'tên',
  messageId: 'tin nhắn',
  mode: 'chế độ',
  name: 'tên',
  scopes: 'quyền',
  strikeId: 'cảnh cáo',
  version: 'phiên bản',
  weight: 'trọng số',
};

/** Giá trị dạng mã hay gặp trong chi tiết (vd mở khoá tài khoản `cause: strike` = vì cảnh cáo hết hiệu lực). */
const VALUE_LABEL: Record<string, string> = {
  strike: 'cảnh cáo',
  report: 'báo cáo',
  manual: 'tay',
  true: 'có',
  false: 'không',
};

export const auditActionLabel = (action: string): string => ACTION_LABEL[action] ?? action;

export const auditTargetLabel = (type: string, id: string): string =>
  `${TARGET_LABEL[type] ?? type} ${id}`;

export const jobLabel = (name: string): string => JOB_LABEL[name] ?? name;

/** Chi tiết của dòng nhật ký, tóm tắt của lượt chạy việc: "khoá: giá trị" nối bằng dấu chấm giữa. */
export const detailsLabel = (details: Record<string, unknown>): string | null => {
  const parts = Object.entries(details).flatMap(([k, v]) =>
    v === null || v === undefined || v === ''
      ? []
      : [`${DETAIL_LABEL[k] ?? k}: ${VALUE_LABEL[String(v)] ?? String(v)}`],
  );
  return parts.length > 0 ? parts.join(' · ') : null;
};
