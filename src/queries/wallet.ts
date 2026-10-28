import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useIsAuthenticated } from '@/stores/auth';
import { qk } from './keys';

/* Ví Xu của tôi (ghim-server add-wallet): số dư cho dòng ở tab Cá nhân, lịch sử cho màn Ví Xu. Chỉ hỏi khi đã đăng nhập. */

export function useMyWallet() {
  const authenticated = useIsAuthenticated();
  return useQuery({
    queryKey: qk.wallet.balance(),
    queryFn: api.getMyWallet,
    enabled: authenticated,
  });
}

export function useMyWalletTransactions() {
  const authenticated = useIsAuthenticated();
  return useQuery({
    queryKey: qk.wallet.transactions(),
    queryFn: api.getMyWalletTransactions,
    enabled: authenticated,
  });
}
