/**
 * テストデータ seed スクリプト（ローカル開発用）
 *
 * service role でホスト型 Supabase に「テスト世帯」とテストユーザー2名（夫婦）、
 * 代表的な取引・精算を冪等に投入する。再実行するとテスト世帯の取引/精算を
 * 入れ替えて同じ状態に戻す。
 *
 * 実行: pnpm --filter web seed:test
 * 投入内容の確認のみ: pnpm --filter web seed:test -- --dry-run
 */

import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(scriptDir, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

/** テスト世帯の固定 UUID（冪等な特定に使用） */
const TEST_HOUSEHOLD_ID = '00000000-0000-4000-8000-000000000001';

const TARO = {
  email: process.env.NEXT_PUBLIC_DEV_LOGIN_TARO_EMAIL ?? 'test-taro@example.com',
  password:
    process.env.NEXT_PUBLIC_DEV_LOGIN_TARO_PASSWORD ?? 'devpassword123',
  name: 'テスト太郎',
};
const HANAKO = {
  email:
    process.env.NEXT_PUBLIC_DEV_LOGIN_HANAKO_EMAIL ?? 'test-hanako@example.com',
  password:
    process.env.NEXT_PUBLIC_DEV_LOGIN_HANAKO_PASSWORD ?? 'devpassword123',
  name: 'テスト花子',
};

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください'
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** メールから既存ユーザーを探し、無ければ作成して id を返す */
async function ensureUser(
  account: {
    email: string;
    password: string;
    name: string;
  },
  existingUsers: { id: string; email?: string }[]
): Promise<string> {
  const existing = existingUsers.find((u) => u.email === account.email);
  if (existing) {
    console.log(`  user 既存: ${account.email} (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { name: account.name },
  });
  if (error) throw error;
  console.log(`  user 作成: ${account.email} (${data.user.id})`);
  return data.user.id;
}

/** 1日前/数日前などの日付文字列(YYYY-MM-DD)を返す */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('sv-SE'); // YYYY-MM-DD（ローカルTZ）
}

async function main() {
  console.log(DRY_RUN ? '[dry-run] 投入内容のプレビュー' : 'seed 開始');

  // 1. ユーザー
  console.log('1. テストユーザー');
  let taroId: string;
  let hanakoId: string;
  if (DRY_RUN) {
    console.log(`  ${TARO.email} (owner), ${HANAKO.email} (member)`);
    taroId = 'taro-id';
    hanakoId = 'hanako-id';
  } else {
    const { data: list, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) throw listError;
    taroId = await ensureUser(TARO, list.users);
    hanakoId = await ensureUser(HANAKO, list.users);
  }

  // 2. テスト世帯（固定 UUID で find-or-create）
  console.log('2. テスト世帯');
  if (DRY_RUN) {
    console.log('  世帯 find-or-create: テスト世帯 (固定UUID)');
    console.log('3. メンバー upsert (2件)');
  }
  if (!DRY_RUN) {
    const { data: hh } = await admin
      .from('households')
      .select('id')
      .eq('id', TEST_HOUSEHOLD_ID)
      .maybeSingle();
    if (!hh) {
      const { error } = await admin.from('households').insert({
        id: TEST_HOUSEHOLD_ID,
        name: 'テスト世帯',
        owner_user_id: taroId,
      });
      if (error) throw error;
      console.log('  世帯 作成: テスト世帯');
    } else {
      console.log('  世帯 既存: テスト世帯');
    }

    // 3. メンバー
    const { error: memberError } = await admin
      .from('household_members')
      .upsert(
        [
          {
            household_id: TEST_HOUSEHOLD_ID,
            user_id: taroId,
            role: 'owner',
          },
          {
            household_id: TEST_HOUSEHOLD_ID,
            user_id: hanakoId,
            role: 'member',
          },
        ],
        { onConflict: 'household_id,user_id' }
      );
    if (memberError) throw memberError;
    console.log('3. メンバー upsert 完了');
  }

  // 4. 取引・精算（テスト世帯ぶんを入れ替え）
  console.log('4. 取引・精算');
  const transactions = [
    { type: 'expense', amount: 5200, category: 'groceries', occurred_on: daysAgo(2), note: 'スーパー', payer_user_id: taroId, created_by: taroId },
    { type: 'expense', amount: 3800, category: 'dining', occurred_on: daysAgo(3), note: 'ランチ', payer_user_id: hanakoId, created_by: hanakoId },
    { type: 'expense', amount: 1500, category: 'daily', occurred_on: daysAgo(5), note: '日用品', payer_user_id: taroId, created_by: taroId },
    { type: 'expense', amount: 2200, category: 'medical', occurred_on: daysAgo(7), note: '薬', payer_user_id: hanakoId, created_by: hanakoId },
    { type: 'expense', amount: 18000, category: 'home', occurred_on: daysAgo(10), note: '家電', payer_user_id: taroId, created_by: taroId },
    { type: 'expense', amount: 4300, category: 'kids', occurred_on: daysAgo(12), note: '子ども用品', payer_user_id: hanakoId, created_by: hanakoId },
    { type: 'expense', amount: 980, category: 'other', occurred_on: daysAgo(14), note: 'その他', payer_user_id: taroId, created_by: taroId },
    { type: 'income', amount: 280000, category: 'salary', occurred_on: daysAgo(1), note: '給料', payer_user_id: taroId, created_by: taroId },
    { type: 'income', amount: 60000, category: 'sideline', occurred_on: daysAgo(6), note: '副業', payer_user_id: hanakoId, created_by: hanakoId },
    { type: 'advance', amount: 90000, category: 'home', occurred_on: daysAgo(8), note: '家賃立替', payer_user_id: taroId, advance_to_user_id: null, created_by: taroId },
    { type: 'advance', amount: 7000, category: 'other', occurred_on: daysAgo(4), note: '花子の買い物立替', payer_user_id: taroId, advance_to_user_id: hanakoId, created_by: taroId },
  ].map((t) => ({ household_id: TEST_HOUSEHOLD_ID, ...t }));

  const settlements = [
    { household_id: TEST_HOUSEHOLD_ID, from_user_id: hanakoId, to_user_id: taroId, amount: 3000, settled_on: daysAgo(1), note: '一部精算', created_by: hanakoId },
  ];

  if (DRY_RUN) {
    console.log(`  transactions: ${transactions.length} 件`);
    console.log(`  settlements: ${settlements.length} 件`);
    console.log('[dry-run] DB は変更していません');
    return;
  }

  const { error: delSettle } = await admin
    .from('settlements')
    .delete()
    .eq('household_id', TEST_HOUSEHOLD_ID);
  if (delSettle) throw delSettle;
  const { error: delTx } = await admin
    .from('transactions')
    .delete()
    .eq('household_id', TEST_HOUSEHOLD_ID);
  if (delTx) throw delTx;

  const { error: txError } = await admin.from('transactions').insert(transactions);
  if (txError) throw txError;
  const { error: settleError } = await admin.from('settlements').insert(settlements);
  if (settleError) throw settleError;

  console.log(
    `  取引 ${transactions.length} 件 / 精算 ${settlements.length} 件 投入完了`
  );
  console.log('seed 完了');
}

main().catch((err) => {
  console.error('seed 失敗:', err);
  process.exit(1);
});
