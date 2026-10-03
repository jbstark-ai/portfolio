import { expect, test } from '@playwright/test'

test('swipe flow: back a creator and see them under Matches', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Mei Lin' })).toBeVisible()
  await expect(page.getByText('Digital art')).toBeVisible()
  await expect(page.getByText('Poetry')).toBeVisible()
  await page.getByRole('button', { name: /Fund/ }).click()
  await expect(page.getByRole('alert')).toContainText("It's a match!")
  await page.getByRole('tab', { name: 'Matches' }).click()
  await expect(page.getByText('Mei Lin')).toBeVisible()
  await expect(page.getByText('Mutual match')).toBeVisible()
})

test('i18n: en → zh → ja → ko', async ({ page }) => {
  await page.goto('/')
  for (const [label, text] of [['中文', '藝術贊助'], ['日本語', 'パトロネージ'], ['한국어', '패트로니지'], ['EN', 'Patronage']]) {
    await page.getByRole('button', { name: label }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(text)
  }
})

test('theme follows the OS colour scheme', async ({ page }) => {
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  expect(await bg()).toBe('rgb(0, 0, 0)')
  await page.emulateMedia({ colorScheme: 'light' })
  expect(await bg()).toBe('rgb(244, 245, 248)')
})

for (const [name, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900 }]] as const) {
  test(`responsive layout (${name}): card and actions fit with no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const card = page.getByTestId('card')
    await expect(card).toBeVisible()
    const fund = page.getByRole('button', { name: /Fund/ })
    await expect(fund).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const tabs = await page.getByRole('tablist').boundingBox()
    // tab bar pins to the bottom on mobile and sits under the header on desktop
    if (name === 'mobile') expect(tabs!.y + tabs!.height).toBeGreaterThan(viewport.height - 4)
    else expect(tabs!.y).toBeLessThan(200)
  })
}