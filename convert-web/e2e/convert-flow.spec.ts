import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { apiHealthy } from './helpers'

test.describe('integration (real backend)', () => {
  test.beforeEach(async () => {
    const ok = await apiHealthy()
    test.skip(!ok, 'Start convert-platform API on :8000 for integration tests')
  })

  test('png to webp upload and poll', async ({ page }) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'convert-e2e-'))
    const pngPath = path.join(tmp, 'sample.png')
    // minimal 1x1 PNG
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    fs.writeFileSync(pngPath, png)

    await page.goto('/')
    await page.locator('input[type=file]').setInputFiles(pngPath)
    await page.getByLabel('目标格式').selectOption({ label: 'WEBP' })
    await page.getByRole('button', { name: '开始转换' }).click()

    await expect(page.getByText('已完成').or(page.getByText('失败'))).toBeVisible({
      timeout: 120_000,
    })
  })
})
