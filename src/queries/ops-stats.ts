import { useQuery } from '@tanstack/react-query';
import { opsApi } from '@/api/ops';
import { qk } from './keys';

/** Bảng số 7 ngày trên trang chủ bàn vận hành — một tuần đủ nhìn nhịp, cùng cỡ với mục "Hôm nay" của thiết kế. */
const DAILY_DAYS = 7;
/** Số theo ngày đổi chậm; tải lại mỗi 5 phút là đủ, không như hàng chờ. */
const DAILY_REFRESH_MS = 5 * 60_000;

/** 12 tháng như mặc định của server — đủ thấy một năm nhịp mùa vụ của máy. */
const MACHINE_MONTHS = 12;

/** Chỉ master được đọc (`/ops/stats/daily` trả 403 cho staff) — màn hình truyền `enabled` theo vai, không gọi để rồi báo lỗi. */
export function useDailyStats(enabled: boolean) {
  return useQuery({
    queryKey: qk.ops.daily(DAILY_DAYS),
    queryFn: () => opsApi.dailyStats(DAILY_DAYS),
    enabled,
    refetchInterval: DAILY_REFRESH_MS,
  });
}

/** Màn số liệu máy chỉ mở từ mục "Chỉ master"; số theo tháng đổi chậm nên không tải lại theo nhịp. */
export function useMachineStats() {
  return useQuery({
    queryKey: qk.ops.machineStats(MACHINE_MONTHS),
    queryFn: () => opsApi.machineStats(MACHINE_MONTHS),
  });
}
