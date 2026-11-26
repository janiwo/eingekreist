import { expect, test, type Page } from '@playwright/test'
import { nameInput, openGlobe, startGame, stored } from './helpers'

const prompt = (page: Page) => page.getByTestId('prompt')

test('creates a game that survives a reload', async ({ page }) => {
  const { expectNoErrors } = await openGlobe(page)

  // Players: rename both, add a third and give it the first player's color (they swap).
  await nameInput(page, 1).fill('Anna')
  await nameInput(page, 2).fill('Ben')
  await page.getByRole('button', { name: 'Spieler hinzufügen' }).click()
  await nameInput(page, 3).fill('Cem')
  await page.getByRole('button', { name: 'Farbe von Cem ändern' }).click()
  await page.getByRole('radio', { name: 'Rot' }).click()

  // Settings: target score 4, no timer, only waters and landmarks.
  await page.getByRole('button', { name: 'Weniger' }).click()
  await expect(page.getByTestId('target-score')).toHaveText('4')
  await page.getByLabel('Zeit pro Zug').selectOption({ label: 'Ohne Zeitlimit' })
  for (const c of ['Länder', 'Städte', 'Inseln', 'Landschaften']) {
    await page.getByRole('button', { name: c }).click()
  }
  await expect(page.getByRole('button', { name: 'Gewässer' })).toHaveAttribute('aria-pressed', 'true')

  // Empty names block the start.
  await nameInput(page, 2).fill('')
  await expect(page.getByRole('alert')).toContainText('Jeder Spieler braucht einen Namen')
  await expect(page.getByRole('button', { name: 'Spiel starten' })).toBeDisabled()
  await nameInput(page, 2).fill('Ben')

  await startGame(page)
  await expect(prompt(page)).toContainText('Runde 1 · Ziel: 4 Punkte')
  await expect(prompt(page)).toContainText(/Gewässer|Sehenswürdigkeit/)
  // Timer disabled: none is shown.
  await expect(page.getByRole('timer')).toHaveCount(0)
  const promptText = await prompt(page).textContent()
  const before = await stored(page)
  expect(before.phase).toBe('playing')
  expect(before.players.map((p: { name: string }) => p.name)).toEqual(['Anna', 'Ben', 'Cem'])
  expect(before.players[2].color).toBe('#e53935')
  expect(before.settings).toMatchObject({ targetScore: 4, turnSeconds: null, categories: ['water', 'landmark'] })

  // Reload: the same game continues.
  await openGlobe(page)
  await expect(prompt(page)).toHaveAttribute('data-ready', 'true')
  await expect(prompt(page)).toHaveText(promptText!)
  expect(await stored(page)).toEqual(before)

  // "New game" (after confirming) returns to a fresh setup.
  await page.getByRole('button', { name: 'Neues Spiel' }).click()
  await page.getByRole('button', { name: 'Weiterspielen' }).click()
  await expect(prompt(page)).toBeVisible()
  await page.getByRole('button', { name: 'Neues Spiel' }).click()
  await page.getByRole('button', { name: 'Neues Spiel starten' }).click()
  await expect(nameInput(page, 1)).toHaveValue('Spieler 1')
  await expect(nameInput(page, 3)).toHaveCount(0)
  expect((await stored(page)).phase).toBe('setup')

  expectNoErrors()
})

test('keeps the setup draft across a reload', async ({ page }) => {
  await openGlobe(page)
  await nameInput(page, 1).fill('Dora')
  await openGlobe(page)
  await expect(nameInput(page, 1)).toHaveValue('Dora')
})
