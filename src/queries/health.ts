import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { qk } from './keys';

/** Đèn báo backend trên màn Bảng tin. 10 giây thay cho 30 giây mặc định: đèn báo mà trễ nửa phút là vô dụng. */
export function useReadiness() {
  return useQuery({ queryKey: qk.health(), queryFn: api.getReadiness, staleTime: 10_000 });
}
