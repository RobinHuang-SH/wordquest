import { expect, test } from '@playwright/test'

async function seedOnboardedState(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const now = new Date()
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
    if (localStorage.getItem('wordquest-state')) return
    localStorage.setItem(
      'wordquest-state',
      JSON.stringify({
        version: 2,
        state: {
          onboarded: true,
          displayName: 'Mia',
          level: 'A2',
          genre: '奇幻冒险',
          accent: '美式',
          learned: {},
          currentWord: 0,
          quizAnswers: { 0: '发现', 1: 'courage', 2: 'signal', 3: 'whisper', 4: 'ancient' },
          quizDone: true,
          storyChoice: '',
          completed: false,
          streak: 7,
          wordMix: '15+5',
          storyLength: 'medium',
          dailyMinutes: 20,
          activeDate: date,
          sessions: {},
        },
      }),
    )
  })
}

test.beforeEach(async ({ page }) => {
  await seedOnboardedState(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
})

test('learner can rename profile and keep it after reload', async ({ page }) => {
  await page.getByRole('button', { name: '设置', exact: true }).click()
  const name = page.getByRole('textbox', { name: '你的名字' })
  await name.fill('Lin')
  await name.blur()
  await page.reload({ waitUntil: 'domcontentloaded' })

  await page.getByRole('button', { name: '设置', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '你的名字' })).toHaveValue('Lin')
})

test('same-day story choices update one learning record', async ({ page }) => {
  await page.getByRole('button', { name: '故事', exact: true }).click()
  await page.getByRole('button', { name: /进入地下通道/ }).click()
  await page.getByRole('button', { name: '查看学习总结' }).click()
  await expect(page.getByText(/本周已有 1 天留下完整记录/)).toBeVisible()

  await page.getByRole('button', { name: '故事', exact: true }).click()
  await page.getByRole('button', { name: /返回研究机器/ }).click()
  await page.getByRole('button', { name: '查看学习总结' }).click()
  await expect(page.getByText(/本周已有 1 天留下完整记录/)).toBeVisible()

  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('wordquest-state') ?? '{}'),
  )
  expect(Object.keys(stored.state.sessions)).toHaveLength(1)
  expect(Object.values(stored.state.sessions)[0]).toMatchObject({ storyChoice: 'machine' })
})

test('mobile shell does not overflow horizontally', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload({ waitUntil: 'domcontentloaded' })
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
})

test('production app shell and learning state remain available offline', async ({
  page,
  context,
}) => {
  await page.evaluate(() => navigator.serviceWorker.ready)
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
    await page.reload({ waitUntil: 'domcontentloaded' })
  }
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true)

  try {
    await context.setOffline(true)
    await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false)
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Mia', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('status')).toContainText('当前处于离线模式')
  } finally {
    await context.setOffline(false)
  }
})

test('settings provides install guidance and generated cache metadata', async ({ page }) => {
  const serviceWorker = await page.request.get('/sw.js')
  const source = await serviceWorker.text()
  expect(source).toContain('wordquest-precache-')
  expect(source).toContain('/assets/')
  expect(source).toContain('/icons/icon-512.png')

  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: /查看安装方法/ }).click()
  await expect(page.getByText(/Chrome/)).toBeVisible()
  await expect(page.getByText(/添加到主屏幕/)).toBeVisible()
})
