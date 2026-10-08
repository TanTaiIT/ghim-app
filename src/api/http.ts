/**
 * Tầng HTTP: base URL + token của phiên cho SDK sinh từ OpenAPI (`runtimeConfigPath` của hey-api).
 *
 * File này là LÁ của `src/api/**`: không import `stores/**` (folder.convention §6). Token được
 * `queries/auth.ts` đẩy xuống qua `setHttpAccessToken` — đó là layer được phép chạm cả hai bên.
 */

/** Không có `/api/v1` ở đây: đường dẫn đầy đủ nằm trong SDK, vì OpenAPI của server khai đủ tiền tố. */
const BASE_URL: string = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3100';

let accessToken: string | null = null;

export function setHttpAccessToken(next: string | null): void {
  accessToken = next;
}

/**
 * Lỗi nghiệp vụ từ backend, đã bóc khỏi vỏ `{ success: false, error: { code, message } }`.
 *
 * `code` là thứ màn hình rẽ nhánh (`ACCOUNT_LOCKED`, `EMAIL_TAKEN`…); `message` là câu tiếng Việt do
 * server soạn cho người dùng, hiện thẳng qua toast. Không hardcode lại câu lỗi ở màn hình.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Hợp đồng của hey-api: `client.gen.ts` gọi hàm này lúc khởi tạo client, luôn truyền config mặc định.
 * Generic để file biên dịch được cả khi `src/api/generated/**` chưa sinh — type thật của `config` đến
 * từ chính output đó.
 */
export const createClientConfig = <T extends object>(config: T) => ({
  ...config,
  baseUrl: BASE_URL,
  // SDK chỉ gọi hàm này cho endpoint có `security: [{ bearerAuth }]` trong OpenAPI.
  auth: () => accessToken ?? undefined,
});
