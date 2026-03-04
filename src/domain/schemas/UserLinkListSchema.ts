import { z } from 'zod';

const UserLinkEntrySchema = z.object(
  {
    key: z.string().min(1, 'は必須文字列です'),
    title: z.string().min(1, 'は必須文字列です'),
    destination: z.string().min(1, 'は必須文字列です'),
    createdAt: z.number({
      invalid_type_error: 'は数値である必要があります'
    }).finite('は数値である必要があります'),
    expiresAt: z.number({
      invalid_type_error: 'は数値である必要があります'
    }).finite('は数値である必要があります')
  },
  { invalid_type_error: 'はオブジェクトである必要があります' }
);

export const UserLinkListSchema = z.object(
  {
    v: z.literal(1, {
      errorMap: () => ({ message: 'リンク一覧データのバージョンが不正です' })
    }),
    links: z.array(UserLinkEntrySchema, {
      invalid_type_error: 'links は配列である必要があります'
    })
  },
  {
    invalid_type_error: 'リンク一覧データはオブジェクトである必要があります'
  }
);
