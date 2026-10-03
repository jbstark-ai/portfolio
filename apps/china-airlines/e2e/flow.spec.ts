import { expect, test } from '@playwright/test'

test('AI prompt navigates to a destination poster with flights', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('Try: cheap flight to Tokyo').fill('cheap flight to Tokyo')
  await page.getByRole('button', { name: 'Plan with AI' }).click()
  await expect(page.getByTestId('city')).toHaveText('Tokyo')
  await expect(page.getByTestId('poster')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Book' }).first()).toBeVisible()
})

test('from / to / dates search shows the route and dates', async ({ page }) => {
  await page.goto('/')
  await page.locator('.search select').first().selectOption('TPE')
  await page.locator('.search select').nth(1).selectOption('SEL')
  await page.locator('.search input[type=date]').first().fill('2026-11-03')
  await page.locator('.search input[type=date]').nth(1).fill('2026-11-10')
  await page.getByRole('button', { name: 'Search flights' }).click()
  await expect(page.getByTestId('city')).toHaveText('Seoul')
  await expect(page.getByTestId('route')).toContainText('TPE → SEL · 2026-11-03 – 2026-11-10')
})

test('language switcher translates the hero (en, zh, ja, ko)', async ({ page }) => {
  await page.goto('/')
  for (const [label, text] of [['中文', '想去哪裡'], ['日本語', 'どこへ'], ['한국어', '어디로'], ['EN', 'Where to']]) {
    await page.getByRole('button', { name: label }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(text)
  }
})



