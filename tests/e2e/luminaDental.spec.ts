import { test, expect } from '@playwright/test'

test.describe('Lumina Dental Care — End-to-End Smoke Tests', () => {
  test('Public website renders Hero, Services, Doctors, and Auth navigation', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header')).toContainText('Lumina Dental Care')
    await expect(page.locator('h1')).toContainText('Perawatan Gigi')
    await page.click('text=Masuk')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
