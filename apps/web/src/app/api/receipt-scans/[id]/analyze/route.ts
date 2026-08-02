import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/types/supabase';
import { receiptOcrResultSchema } from '@/types/receipt';
import { mapReceiptScan } from '@/services/receiptScans';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RECEIPT_RESULT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    amount: {
      type: ['integer', 'null'],
      description: '税込の支払合計金額（日本円）。小計、預り金、釣銭は含めない。',
    },
    occurredOn: {
      type: ['string', 'null'],
      description: '購入日。確実に読める場合だけYYYY-MM-DD形式で返す。',
    },
    place: {
      type: ['string', 'null'],
      description: '店舗名。支店名が明確なら含め、住所は含めない。50文字以内。',
    },
    category: {
      type: ['string', 'null'],
      enum: [
        'groceries',
        'dining',
        'daily',
        'medical',
        'home',
        'kids',
        'transportation',
        'fixed',
        'other',
        null,
      ],
      description: '購入内容から推定した家計簿カテゴリ。',
    },
    ambiguousFields: {
      type: 'array',
      items: { enum: ['amount', 'occurredOn', 'place', 'category'] },
      description: '不鮮明、候補が複数、または推測に頼る項目。',
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
      description: 'レシートではない、不鮮明、複数レシートが写っている等の警告。',
    },
  },
  required: ['amount', 'occurredOn', 'place', 'category', 'ambiguousFields', 'warnings'],
} as const;

const RECEIPT_PROMPT = `
あなたは日本の家計簿用レシート読取アシスタントです。画像1枚から取引合計だけを抽出してください。

ルール:
- amount は、消費税を含む最終的な支払合計です。「小計」「預り」「お預かり」「釣銭」「おつり」は採用しません。
- occurredOn は購入・会計日時の日付です。印刷日時やポイント期限を採用しません。
- place は店舗名または店舗名＋支店名です。住所や電話番号は含めません。
- category は groceries=食費、dining=外食費、daily=日用品、medical=医療費、home=家具・家電、kids=子ども、transportation=交通費、fixed=固定費、other=その他 から選びます。
- 商品明細は返しません。
- 値を確実に特定できない場合は推測せず null にし、その項目を ambiguousFields に加えます。
- レシートでない画像、複数レシート、不鮮明な画像は warnings に日本語で記載します。
`;

type ReceiptScanRow = Database['public']['Tables']['receipt_scans']['Row'];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (/429|RESOURCE_EXHAUSTED|rate limit/i.test(error.message)) {
      return 'Geminiの無料枠またはレート上限に達しました。少し待って再解析してください。';
    }
    if (/timeout|timed out/i.test(error.message)) {
      return 'レシート解析がタイムアウトしました。再解析してください。';
    }
  }
  return 'レシートを解析できませんでした。画像を確認して再解析してください。';
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { data: scan, error: scanError } = await supabase
    .from('receipt_scans')
    .select('*')
    .eq('id', id)
    .single();
  if (scanError || !scan || scan.created_by !== user.id) {
    return NextResponse.json({ error: 'レシート下書きが見つかりません' }, { status: 404 });
  }
  if (scan.status === 'registered' || scan.status === 'orphaned') {
    return NextResponse.json({ error: 'このレシートは解析できません' }, { status: 409 });
  }

  const { error: processingError } = await supabase
    .from('receipt_scans')
    .update({ status: 'processing', ocr_error: null })
    .eq('id', id);
  if (processingError) {
    return NextResponse.json({ error: '解析を開始できませんでした' }, { status: 409 });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    const { data: image, error: downloadError } = await supabase.storage
      .from('receipt-images')
      .download(scan.storage_path);
    if (downloadError || !image) {
      throw new Error('Receipt image download failed');
    }

    const base64Image = Buffer.from(await image.arrayBuffer()).toString('base64');
    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create(
      {
        model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
        store: false,
        input: [
          { type: 'text', text: RECEIPT_PROMPT },
          {
            type: 'image',
            data: base64Image,
            mime_type: scan.mime_type,
            resolution: 'high',
          },
        ],
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: RECEIPT_RESULT_JSON_SCHEMA,
        },
      },
      { timeout: 45_000, maxRetries: 1 }
    );

    if (!interaction.output_text) {
      throw new Error('Gemini returned an empty response');
    }
    const parsed = receiptOcrResultSchema.parse(JSON.parse(interaction.output_text));
    const { data: updated, error: updateError } = await supabase
      .from('receipt_scans')
      .update({
        status: 'ready',
        ocr_result: parsed as unknown as Json,
        ocr_error: null,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError || !updated) {
      throw new Error('Receipt result save failed');
    }
    return NextResponse.json({ scan: mapReceiptScan(updated as ReceiptScanRow) });
  } catch (error) {
    console.error('レシートOCRエラー:', error);
    const message = getErrorMessage(error);
    await supabase
      .from('receipt_scans')
      .update({ status: 'failed', ocr_error: message })
      .eq('id', id);
    const status = /上限/.test(message) ? 429 : /GEMINI_API_KEY/.test(String(error)) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

