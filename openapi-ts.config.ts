import { defineConfig } from '@hey-api/openapi-ts';

/**
 * Codegen SDK gọi backend `ghim-server` (Fastify + Zod → OpenAPI 3), repo `../ghim-server`.
 *
 * Input mặc định là tài liệu OpenAPI do chính server đang chạy phục vụ (`/docs/json`, bật ở dev):
 * tài liệu đó sinh từ đúng schema Zod đang validate request, nên không có bản nào lệch với code để
 * mà commit. Muốn sinh từ file tĩnh thì `OPENAPI_INPUT=./openapi.json npm run api:sync`.
 *
 * Không sinh hook TanStack: hook là việc của `src/queries/**` với key factory `qk`
 * (query.convention §2/§3). Sinh thêm là có hai bộ hook cho cùng một endpoint.
 */
export default defineConfig({
  input: process.env.OPENAPI_INPUT ?? 'http://localhost:3100/docs/json',
  output: { path: 'src/api/generated' },
  plugins: [
    // Không để đuôi `.ts`: hey-api dùng nguyên chuỗi này làm import path trong `client.gen.ts`, mà
    // tsconfig không bật `allowImportingTsExtensions`.
    { name: '@hey-api/client-fetch', runtimeConfigPath: './src/api/http' },
    '@hey-api/typescript',
    '@hey-api/sdk',
  ],
});
