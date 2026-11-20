import { expect, test, type Page } from '@playwright/test'
import { openGlobe, setUpGame, startTurn } from './helpers'

const helpButton = (page: Page) => page.getByRole('button', { name: 'So wird gespielt' })
const dialog = (page: Page) => page.getByRole('dialog', { name: 'So wird gespielt' })

test('opens the instructions from the start screen, with the current settings', async ({ page }) => {
  const { expectNoErrors } = await openGlobe(page)

  await helpButton(page).click()
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page)).toContainText('Wer zuerst 10 Punkte hat, gewinnt.')
  await expect(dialog(page)).toContainText('Du hast 60 Sekunden.')
  await expect(dialog(page).getByRole('img', { name: 'Beispiel: Drei Kreise um einen Ort' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()

  // The text follows the settings; „Verstanden“ closes it too.
  await page.getByLabel('Zeit pro Zug').selectOption({ label: 'Ohne Zeitlimit' })
  await helpButton(page).click()
  await expect(dialog(page)).toContainText('Es gibt kein Zeitlimit.')
  await dialog(page).getByRole('button', { name: 'Verstanden' }).click()
  await expect(dialog(page)).toBeHidden()
  expectNoErrors()
})

test('opens the instructions from the handover, but not during a turn', async ({ page }) => {
  const { expectNoErrors } = await openGlobe(page)
  await setUpGame(page, ['Anna', 'Ben'], { targetScore: 3 })

  await expect(page.getByTestId('handover')).toBeVisible()
  await helpButton(page).click()
  await expect(dialog(page)).toContainText('Wer zuerst 3 Punkte hat, gewinnt.')
  await dialog(page).getByRole('button', { name: 'Schließen' }).click()
  await expect(dialog(page)).toBeHidden()

  await startTurn(page, 'Anna')
  await expect(helpButton(page)).toHaveCount(0)
  expectNoErrors()
})
