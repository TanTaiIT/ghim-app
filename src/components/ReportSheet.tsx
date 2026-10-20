import { REPORT_CATEGORIES, REPORT_CATEGORY_LABEL, type ReportCategory } from '@/api/client';
import { PickerSheet } from './PickerSheet';

const REPORT_REASONS = REPORT_CATEGORIES.map((value) => ({
  value,
  label: REPORT_CATEGORY_LABEL[value],
}));

/**
 * Bảng lý do báo cáo — một tin (nút lá cờ ở màn chi tiết) hay một người (từ hội thoại). Gửi báo cáo là việc của
 * route — sheet chỉ trả lý do đã chọn.
 */
export function ReportSheet({
  visible,
  title,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  onSelect: (category: ReportCategory) => void;
  onClose: () => void;
}) {
  return (
    <PickerSheet
      visible={visible}
      title={title}
      options={REPORT_REASONS}
      value={null}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
}
