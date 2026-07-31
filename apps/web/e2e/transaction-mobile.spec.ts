import { expect, test } from '@playwright/test';

test('iPhone幅でタップした取引入力欄が正しくフォーカスされる', async ({ page }) => {
  await page.goto('/');

  const devLogin = page.getByRole('button', { name: 'テスト太郎でログイン' });
  if (await devLogin.isVisible()) {
    await devLogin.click();
  }

  await expect(page.getByRole('tab', { name: '月次ビュー' })).toBeVisible();
  // Next.js の開発インジケーターが画面右下を覆うことがあるため、
  // モーダルを開く操作だけは強制し、フォーム内の操作は実際の tap で検証する。
  await page.locator('nav').getByRole('button', { name: '支出' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByRole('dialog', { name: '取引を登録' })).toBeVisible();

  const fields = [
    page.getByLabel('金額'),
    page.getByLabel('日付'),
    page.getByLabel('メモ'),
    page.getByLabel('場所（任意）'),
  ];

  for (const field of fields) {
    await field.tap();
    await expect(field).toBeFocused();
    const box = await field.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  await page.getByRole('button', { name: 'キャンセル' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.locator('nav').getByRole('button', { name: '収入' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByRole('tab', { name: '収入' })).toHaveAttribute('data-state', 'active');
  await expect(page.getByLabel('金額')).toHaveValue('');
});
