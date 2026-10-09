import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Conversation, Message, OfferStatus } from '@/api/client';
import { mockApi } from '@/api/mock';
import { useIsAuthenticated } from '@/stores/auth';
import { qk } from './keys';

/*
 * Chưa có realtime (backend chưa chọn thư viện): tin nhắn mới của người kia chỉ hiện khi refetch —
 * kéo để làm mới hoặc mở lại màn. Khi có realtime, sự kiện đẩy về sẽ `invalidateQueries` các key dưới.
 */

export function useConversations() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.conversations.list(),
    queryFn: mockApi.getConversations,
    enabled: authed,
  });
}

/** Số tin chưa đọc cho badge ở thanh điều hướng — cùng key với danh sách, không gọi thêm lần nào. */
export function useUnreadTotal(): number {
  const { data } = useConversations();
  return data?.reduce((sum, c) => sum + c.unread, 0) ?? 0;
}

export function useConversation(id: string | undefined) {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.conversations.detail(id ?? ''),
    queryFn: () => mockApi.getConversation(id ?? ''),
    enabled: authed && Boolean(id),
  });
}

export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mockApi.markConversationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations.list() }),
  });
}

/** Lạc quan: bong bóng hiện ngay với id tạm, refetch sau đó thay bằng bản server trả về. */
export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  const key = qk.conversations.detail(conversationId);
  return useMutation({
    mutationFn: (text: string) => mockApi.sendMessage(conversationId, text),
    onMutate: async (text) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Conversation>(key);
      const temp: Message = {
        id: `temp-${Date.now()}`,
        kind: 'text',
        mine: true,
        text,
        at: new Date().toISOString(),
      };
      qc.setQueryData<Conversation>(key, (c) => c && { ...c, messages: [...c.messages, temp] });
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: qk.conversations.list() });
    },
  });
}

export function useSendOffer(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => mockApi.sendOffer(conversationId, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations.all() }),
  });
}

export function useRespondOffer(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      status,
    }: {
      messageId: string;
      status: Exclude<OfferStatus, 'superseded'>;
    }) => mockApi.respondOffer(conversationId, messageId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations.all() }),
  });
}

type ConversationTarget = Parameters<typeof mockApi.openConversation>[0];

/** Mở (hoặc tạo) hội thoại theo ngữ cảnh — trả id để route điều hướng tới `/chat/[id]`. */
export function useOpenConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (to: ConversationTarget) => mockApi.openConversation(to),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations.list() }),
  });
}
