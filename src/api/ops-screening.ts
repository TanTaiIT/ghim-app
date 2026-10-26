import { unwrap, unwrapEmpty } from './client';
import {
  deleteApiV1OpsScreeningRulesByCodeCategoriesByCategoryId,
  deleteApiV1OpsScreeningWhitelistById,
  getApiV1OpsScreeningCategoriesByCategoryIdKeywords,
  getApiV1OpsScreeningPhrases,
  getApiV1OpsScreeningRules,
  getApiV1OpsScreeningWhitelist,
  patchApiV1OpsScreeningPhrasesById,
  postApiV1OpsScreeningPhrases,
  postApiV1OpsScreeningPhrasesByIdActivate,
  postApiV1OpsScreeningPhrasesByIdDeactivate,
  postApiV1OpsScreeningWhitelist,
  putApiV1OpsScreeningBandsByCategoryId,
  putApiV1OpsScreeningCategoriesByCategoryIdKeywords,
  putApiV1OpsScreeningRulesByCodeCategoriesByCategoryId,
} from './generated/sdk.gen';
import type {
  GetApiV1OpsScreeningPhrasesResponses,
  GetApiV1OpsScreeningRulesResponses,
  GetApiV1OpsScreeningWhitelistResponses,
} from './generated/types.gen';

/*
 * Cấu hình máy duyệt trên bàn vận hành ngoài bật / tắt luật chung (`ops.ts`): cụm từ cấm, danh sách trắng ảnh, luật và
 * ngưỡng dải riêng theo danh mục, từ khoá danh mục. Quyền do server: cụm từ, luật, ngưỡng chỉ master; danh sách trắng
 * mọi staff; từ khoá master và staff của danh mục.
 */

type WireBook = GetApiV1OpsScreeningRulesResponses[200]['data'];
type WirePhrase = GetApiV1OpsScreeningPhrasesResponses[200]['data'][number];
type WireWhitelist = GetApiV1OpsScreeningWhitelistResponses[200]['data'][number];

export type RuleMode = WireBook['rules'][number]['mode'];
export type RuleKind = WireBook['rules'][number]['kind'];
export type RuleCode = WireBook['rules'][number]['code'];

export const RULE_MODE_LABEL: Record<RuleMode, string> = {
  on: 'Bật',
  trial: 'Chạy thử',
  off: 'Tắt',
};

/** Trần trọng số một luật của server (`WEIGHT_MAX`); ngưỡng dải tối đa gấp mười. */
export const RULE_WEIGHT_MAX = 100;

/** Một luật như ở danh mục này: giá trị chung, và phần ghi đè riêng (null = dùng giá trị chung). */
export type CategoryRule = {
  code: RuleCode;
  label: string;
  kind: RuleKind;
  weight: number;
  mode: RuleMode;
  override: { weight: number | null; mode: RuleMode | null } | null;
};

export type Bands = { mediumFrom: number; highFrom: number };

/** Máy duyệt nhìn từ một danh mục: luật kèm ghi đè, ngưỡng dải riêng (null = dùng ngưỡng chung). */
export type CategoryScreening = {
  rules: CategoryRule[];
  bands: Bands | null;
  defaultBands: Bands;
};

export function categoryScreening(book: WireBook, categoryId: string): CategoryScreening {
  const overrides = new Map(
    book.overrides.filter((o) => o.categoryId === categoryId).map((o) => [o.code, o]),
  );
  const bands = book.bands.find((b) => b.categoryId === categoryId);
  return {
    rules: book.rules
      .map(({ code, label, kind, weight, mode }) => {
        const o = overrides.get(code);
        return {
          code,
          label,
          kind,
          weight,
          mode,
          override: o ? { weight: o.weight, mode: o.mode } : null,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
    bands: bands ? { mediumFrom: bands.mediumFrom, highFrom: bands.highFrom } : null,
    defaultBands: book.defaultBands,
  };
}

export type PhraseLevel = WirePhrase['level'];

export const PHRASE_LEVEL_LABEL: Record<PhraseLevel, string> = {
  certain: 'Mức chắc — chặn',
  ambiguous: 'Mức mơ hồ — cộng điểm',
};

/** Một cụm từ cấm. Cụm mới chạy thử tới `trialEndsAt`; bật sớm hơn thì server đòi lý do. */
export type Phrase = {
  id: string;
  text: string;
  level: PhraseLevel;
  mode: RuleMode;
  exceptions: string[];
  trialEndsAt: string | null;
  activationReason: string | null;
};

const toPhrase = (w: WirePhrase): Phrase => ({
  id: w.id,
  text: w.text,
  level: w.level,
  mode: w.mode,
  exceptions: w.exceptions,
  trialEndsAt: w.trialEndsAt,
  activationReason: w.activationReason,
});

/** Ảnh mẫu của hãng không tính là ảnh trùng. `uri` null: ảnh nguồn đã bị dọn, mục vẫn chặn theo dấu ảnh đã lưu. */
export type WhitelistEntry = { id: string; uri: string | null; addedAt: string };

const toWhitelist = (w: WireWhitelist): WhitelistEntry => ({
  id: w.id,
  uri: w.url,
  addedAt: w.addedAt,
});

export const screeningApi = {
  /** Bộ luật đầy đủ (chỉ master) — dùng cho màn máy duyệt của một danh mục. */
  book: (): Promise<WireBook> => unwrap(getApiV1OpsScreeningRules()),

  setOverride: async (d: {
    categoryId: string;
    code: RuleCode;
    weight?: number;
    mode?: RuleMode;
  }): Promise<WireBook> =>
    unwrap(
      putApiV1OpsScreeningRulesByCodeCategoriesByCategoryId({
        path: { code: d.code, categoryId: d.categoryId },
        body: { weight: d.weight, mode: d.mode },
      }),
    ),

  clearOverride: (d: { categoryId: string; code: RuleCode }): Promise<void> =>
    unwrapEmpty(
      deleteApiV1OpsScreeningRulesByCodeCategoriesByCategoryId({
        path: { code: d.code, categoryId: d.categoryId },
      }),
    ),

  setBands: (d: { categoryId: string } & Bands): Promise<WireBook> =>
    unwrap(
      putApiV1OpsScreeningBandsByCategoryId({
        path: { categoryId: d.categoryId },
        body: { mediumFrom: d.mediumFrom, highFrom: d.highFrom },
      }),
    ),

  phrases: async (): Promise<Phrase[]> =>
    (await unwrap(getApiV1OpsScreeningPhrases())).map(toPhrase),

  /** Cụm mới bắt đầu ở chạy thử; trùng cụm đã có thì 409. */
  createPhrase: async (d: {
    text: string;
    level: PhraseLevel;
    exceptions: string[];
  }): Promise<Phrase> => toPhrase(await unwrap(postApiV1OpsScreeningPhrases({ body: d }))),

  updatePhrase: async (d: {
    id: string;
    level: PhraseLevel;
    exceptions: string[];
  }): Promise<Phrase> =>
    toPhrase(
      await unwrap(
        patchApiV1OpsScreeningPhrasesById({
          path: { id: d.id },
          body: { level: d.level, exceptions: d.exceptions },
        }),
      ),
    ),

  /** Bật thật; chưa hết chạy thử thì cần `reason`. Cụm mức chắc làm server quét lại tin đang hiển thị. */
  activatePhrase: async (d: { id: string; reason?: string }): Promise<Phrase> =>
    toPhrase(
      await unwrap(
        postApiV1OpsScreeningPhrasesByIdActivate({
          path: { id: d.id },
          body: d.reason ? { reason: d.reason } : {},
        }),
      ),
    ),

  deactivatePhrase: async (id: string): Promise<Phrase> =>
    toPhrase(await unwrap(postApiV1OpsScreeningPhrasesByIdDeactivate({ path: { id } }))),

  whitelist: async (): Promise<WhitelistEntry[]> =>
    (await unwrap(getApiV1OpsScreeningWhitelist())).map(toWhitelist),

  /** Ảnh phải đã nằm trong kho — ở bàn vận hành là ảnh của tin đang xử. */
  addWhitelist: async (imageId: string): Promise<WhitelistEntry> =>
    toWhitelist(await unwrap(postApiV1OpsScreeningWhitelist({ body: { imageId } }))),

  removeWhitelist: (id: string): Promise<void> =>
    unwrapEmpty(deleteApiV1OpsScreeningWhitelistById({ path: { id } })),

  /** Server trả từ khoá đã bỏ dấu, viết hoa — đúng dạng nó so với tiêu đề tin. */
  keywords: async (categoryId: string): Promise<string[]> =>
    (await unwrap(getApiV1OpsScreeningCategoriesByCategoryIdKeywords({ path: { categoryId } })))
      .keywords,

  setKeywords: async (d: { categoryId: string; keywords: string[] }): Promise<string[]> =>
    (
      await unwrap(
        putApiV1OpsScreeningCategoriesByCategoryIdKeywords({
          path: { categoryId: d.categoryId },
          body: { keywords: d.keywords },
        }),
      )
    ).keywords,
};
