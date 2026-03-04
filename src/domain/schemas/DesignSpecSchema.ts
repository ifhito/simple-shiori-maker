import { z } from 'zod';

const ai = 'AIに生成したJSONを修正するよう依頼してください';

const DesignLayoutSchema = z.object(
  {
    preset: z.enum(['timeline', 'ticket', 'metro', 'cards', 'serpentine'], {
      errorMap: () => ({
        message: `${ai}: デザインのlayout.presetが不正です（timeline/ticket/metro/cards/serpentineのいずれかにしてください）`
      })
    }),
    density: z
      .enum(['compact', 'comfortable'], {
        errorMap: () => ({
          message: `${ai}: デザインのlayout.densityが不正です（compact/comfortableのいずれかにしてください）`
        })
      })
      .optional(),
    cornerRadius: z
      .number({
        invalid_type_error: `${ai}: デザインのlayout.cornerRadiusは数値である必要があります`
      })
      .finite(`${ai}: デザインのlayout.cornerRadiusは数値である必要があります`)
      .min(0, `${ai}: デザインのlayout.cornerRadiusは0〜28の範囲にしてください`)
      .max(28, `${ai}: デザインのlayout.cornerRadiusは0〜28の範囲にしてください`)
      .optional(),
    showDaySeparators: z
      .boolean({
        invalid_type_error: `${ai}: デザインのlayout.showDaySeparatorsはtrueかfalseにしてください`
      })
      .optional()
  },
  {
    invalid_type_error: `${ai}: デザインのlayout設定はオブジェクトである必要があります`
  }
);

const DesignPaletteSchema = z.object(
  {
    bg: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, `${ai}: デザインの色(bg)が正しいhex値ではありません`)
      .optional(),
    panel: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, `${ai}: デザインの色(panel)が正しいhex値ではありません`)
      .optional(),
    text: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, `${ai}: デザインの色(text)が正しいhex値ではありません`)
      .optional(),
    muted: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, `${ai}: デザインの色(muted)が正しいhex値ではありません`)
      .optional(),
    line: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, `${ai}: デザインの色(line)が正しいhex値ではありません`)
      .optional(),
    accent: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, `${ai}: デザインの色(accent)が正しいhex値ではありません`)
      .optional(),
    accentDark: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, `${ai}: デザインの色(accentDark)が正しいhex値ではありません`)
      .optional()
  },
  {
    invalid_type_error: `${ai}: デザインのpalette設定はオブジェクトである必要があります`
  }
);

const DesignMotifSchema = z.object(
  {
    kind: z
      .string({
        invalid_type_error: `${ai}: デザインのmotif.kindは文字列である必要があります`
      })
      .min(1, `${ai}: デザインのmotif.kindは文字列である必要があります`)
      .max(32, `${ai}: デザインのmotif.kindは32文字以内にしてください`)
      .optional()
  },
  {
    invalid_type_error: `${ai}: デザインのmotif設定はオブジェクトである必要があります`
  }
);

export const DesignSpecSchema = z.object(
  {
    v: z.literal(1, {
      errorMap: () => ({ message: `${ai}: design.vは1にしてください` })
    }),
    layout: DesignLayoutSchema,
    palette: DesignPaletteSchema.optional(),
    motif: DesignMotifSchema.optional()
  },
  {
    invalid_type_error: `${ai}: designはオブジェクトである必要があります`
  }
);
