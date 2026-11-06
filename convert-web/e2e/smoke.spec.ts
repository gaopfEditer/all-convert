import { test, expect } from '@playwright/test'
import { apiHealthy } from './helpers'

test.describe('convert-web smoke', () => {
  test('home renders upload zone', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('拖拽文件到此处')).toBeVisible()
    await expect(page.getByRole('heading', { name: '全格式批量转换' })).toBeVisible()
  })

  test('API health when backend up', async () => {
    const ok = await apiHealthy()
    test.skip(!ok, 'Backend not running at E2E_API_URL')
    expect(ok).toBe(true)
  })
})
