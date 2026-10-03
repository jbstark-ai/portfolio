import { expect, test } from '@playwright/test'

test('add to cart and pay with a wallet', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add to cart' }).first().click()
  await expect(page.getByTestId('count')).toHaveText('1')
  await page.getByRole('link', { name: /Cart/ }).click()
  await page.getByLabel('Wallet address').fill('nope')
  await page.getByRole('button', { name: 'Pay with crypto' }).click()
  await expect(page.getByRole('status')).toContainText('valid 0x')
  await page.getByLabel('Wallet address').fill('0x' + 'a'.repeat(40))
  await page.getByRole('button', { name: 'Pay with crypto' }).click()
  await expect(page.getByRole('status')).toContainText('Payment confirmed!')
})

test('i18n: en → zh → ja → ko', async ({ page }) => {
  await page.goto('/')
  for (const [label, text] of [['中文', '心之所向'], ['日本語', '心惹かれる'], ['한국어', '갖고 싶은'], ['EN', 'Objects of desire']]) {
    await page.getByRole('button', { name: label }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(text)
  }
})
