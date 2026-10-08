import { getHealthReady } from './generated/sdk.gen';
import { ApiError } from './http';

/*
 * Lớp gọi dữ liệu DUY NHẤT của app (HARD#20): mọi hàm ở đây gọi SDK trong `./generated` và đi qua
 * `unwrap`. Domain type khai ngay đây; kiểu wire của `types.gen.ts` không rò lên `queries/` hay `app/`.
 */

/** Vỏ response của ghim-server: `{ success, data | error }`. */
type Envelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

/** Hình dạng kết quả SDK (hey-api, chế độ không throw): dữ liệu hoặc lỗi, kèm response thô. */
type SdkResult<TData> = { data?: TData; error?: unknown; response?: Response };

function isEnvelope(value: unknown): value is Envelope<unknown> {
  return typeof value === 'object' && value !== null && 'success' in value;
}

/**
 * Chỗ duy nhất bóc vỏ response và đổi mọi nhánh hỏng thành `ApiError`.
 *
 * SDK không throw mà trả `{ data, error }`; backend lại trả vỏ ở CẢ hai nhánh (503 của readiness vẫn là
 * `success: true`). Đọc `data ?? error` rồi phân nhánh theo `success` là cách duy nhất không bỏ sót nhánh
 * nào. Không có vỏ nghĩa là chưa tới được server: mạng đứt, proxy trả HTML, server chết giữa chừng.
 */
export async function unwrap<T>(call: Promise<SdkResult<{ success: true; data: T }>>): Promise<T> {
  const { data, error, response } = await call;
  const body: unknown = data ?? error;
  if (isEnvelope(body)) {
    if (body.success) return body.data as T;
    throw new ApiError(
      body.error.code,
      body.error.message,
      response?.status ?? 0,
      body.error.details,
    );
  }
  throw new ApiError(
    'NETWORK_ERROR',
    'Không kết nối được tới máy chủ, kiểm tra mạng rồi thử lại',
    response?.status ?? 0,
  );
}

/* ------------------------------- domain type ------------------------------- */

export type Readiness = { database: 'up' | 'down' };

/* ---------------------------------- api ----------------------------------- */

export const api = {
  getReadiness: (): Promise<Readiness> => unwrap(getHealthReady()),
};
