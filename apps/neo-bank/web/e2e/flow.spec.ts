import { expect, test } from '@playwright/test'

test('send money updates balance and history', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('balance-1')).toHaveText('$2,480.50')
  await page.getByLabel('To').fill('Sam')
  await page.getByLabel('Amount (USD)').fill('80.50')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Sent!')
  await expect(page.getByTestId('balance-1')).toHaveText('$2,400.00')
  await expect(page.getByText('Sam')).toBeVisible()
})

test('overdraft is refused', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('To').fill('Yacht Co')
  await page.getByLabel('Amount (USD)').fill('999999')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Not enough funds')
})

test('i18n: en → zh → ja → ko', async ({ page }) => {
  await page.goto('/')
  for (const [label, text] of [['中文', '轉帳'], ['日本語', '送金'], ['한국어', '송금'], ['EN', 'Send money']]) {
    await page.getByRole('button', { name: label }).click()
    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(text)
  }
})
