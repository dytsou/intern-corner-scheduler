import { expect, test } from '@playwright/test';

function watchForBackendRequests(page) {
  const backendRequests = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname === '/api/schedule' || pathname === '/health') {
      backendRequests.push(request.url());
    }
  });
  return backendRequests;
}

async function readVisibleAssignments(page) {
  return page.locator('#results-section .table-card').evaluateAll((cards) =>
    cards.map((card, tableIndex) => ({
      tableIndex: tableIndex + 1,
      participants: Array.from(
        card.querySelectorAll('.participant-badge'),
        (badge) => Number(badge.textContent.match(/P(\d+)/)?.[1])
      ),
    }))
  );
}

test('solves in the browser and renders the existing result view', async ({
  page,
}) => {
  const backendRequests = watchForBackendRequests(page);
  await page.goto('/');

  await expect
    .poll(() => page.evaluate(() => window.crossOriginIsolated))
    .toBe(true);

  await page.getByLabel('Number of Participants').fill('6');
  await page.getByLabel('Number of Tables').fill('2');
  await page.getByLabel('Number of Rounds').fill('2');
  await page.getByLabel('Time Limit (seconds)').fill('10');

  await page.getByRole('button', { name: '+ Add Pair' }).nth(0).click();
  const sameOncePair = page
    .locator('.pairs-container')
    .nth(0)
    .locator('.pair-item');
  await sameOncePair.locator('.pair-u').fill('3');
  await sameOncePair.locator('.pair-v').fill('4');

  await page.getByRole('button', { name: '+ Add Pair' }).nth(1).click();
  const neverTogetherPair = page
    .locator('.pairs-container')
    .nth(1)
    .locator('.pair-item');
  await neverTogetherPair.locator('.pair-u').fill('3');
  await neverTogetherPair.locator('.pair-v').fill('5');

  await page.getByRole('button', { name: 'Generate Schedule' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Schedule Results' })
  ).toBeVisible();
  await expect(page.locator('#results-section')).toContainText(
    /FEASIBLE|OPTIMAL/
  );

  const participants = new Set([1, 2, 3, 4, 5, 6]);
  let sameOnceMeetings = 0;
  for (let round = 1; round <= 2; round += 1) {
    await page.getByRole('button', { name: `Round ${round}` }).click();
    const visibleTables = await readVisibleAssignments(page);
    const seated = visibleTables.flatMap((table) => table.participants);

    expect(seated).toHaveLength(6);
    expect(new Set(seated)).toEqual(participants);
    expect(visibleTables.map((table) => table.participants.length)).toEqual([
      3, 3,
    ]);
    expect(visibleTables[0].participants).toContain(1);
    expect(visibleTables[1].participants).toContain(2);
    expect(
      visibleTables.some(
        ({ participants: tableParticipants }) =>
          tableParticipants.includes(3) && tableParticipants.includes(5)
      )
    ).toBe(false);

    if (
      visibleTables.some(
        ({ participants: tableParticipants }) =>
          tableParticipants.includes(3) && tableParticipants.includes(4)
      )
    ) {
      sameOnceMeetings += 1;
    }
  }

  expect(sameOnceMeetings).toBe(1);
  await expect(page.locator('.pair-badge.satisfied')).toContainText('3 × 4');
  await expect(page.locator('.pair-badge.violation')).toHaveCount(0);
  expect(backendRequests).toEqual([]);
});

test('cancels an active browser solve and permits retry', async ({ page }) => {
  test.setTimeout(25_000);
  const backendRequests = watchForBackendRequests(page);
  await page.addInitScript(() => {
    const nativePostMessage = Worker.prototype.postMessage;
    const nativeTerminate = Worker.prototype.terminate;
    window.cpSatWorkerProof = {
      solveMessages: [],
      terminations: [],
      cancelButtonFound: false,
    };
    let cancellationScheduled = false;

    Worker.prototype.postMessage = function (message, ...args) {
      const result = nativePostMessage.call(this, message, ...args);
      if (message?.type === 'solve') {
        window.cpSatWorkerProof.solveMessages.push({
          id: message.id,
          postedAt: performance.now(),
        });
        if (!cancellationScheduled) {
          cancellationScheduled = true;
          setTimeout(() => {
            const cancelButton = document.querySelector('#cancel-solve');
            window.cpSatWorkerProof.cancelButtonFound = Boolean(cancelButton);
            cancelButton?.click();
          }, 150);
        }
      }
      return result;
    };
    Worker.prototype.terminate = function (...args) {
      window.cpSatWorkerProof.terminations.push(performance.now());
      return nativeTerminate.apply(this, args);
    };
  });
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.crossOriginIsolated))
    .toBe(true);

  await page.getByLabel('Number of Participants').fill('48');
  await page.getByLabel('Number of Tables').fill('8');
  await page.getByLabel('Number of Rounds').fill('8');
  await page.getByLabel('Time Limit (seconds)').fill('300');
  await page.getByRole('button', { name: 'Generate Schedule' }).click();

  await expect
    .poll(
      () => page.evaluate(() => window.cpSatWorkerProof.solveMessages.length),
      { timeout: 15_000 }
    )
    .toBeGreaterThan(0);
  await expect(page.getByRole('status')).toHaveText(
    'Schedule generation was cancelled. The browser worker has stopped.',
    { timeout: 15_000 }
  );
  await expect
    .poll(
      () => page.evaluate(() => window.cpSatWorkerProof.terminations.length),
      { timeout: 8000 }
    )
    .toBeGreaterThan(0);

  const cancellationProof = await page.evaluate(() => ({
    cancelButtonFound: window.cpSatWorkerProof.cancelButtonFound,
    firstSolvePostedAt: window.cpSatWorkerProof.solveMessages[0]?.postedAt,
    firstTerminationAt: window.cpSatWorkerProof.terminations[0],
  }));
  expect(cancellationProof.cancelButtonFound).toBe(true);
  expect(cancellationProof.firstSolvePostedAt).toBeGreaterThan(0);
  expect(cancellationProof.firstTerminationAt).toBeGreaterThan(
    cancellationProof.firstSolvePostedAt
  );

  await expect(
    page.getByRole('button', { name: 'Generate Schedule' })
  ).toBeEnabled();
  await page.getByLabel('Number of Participants').fill('6');
  await page.getByLabel('Number of Tables').fill('2');
  await page.getByLabel('Number of Rounds').fill('2');
  await page.getByLabel('Time Limit (seconds)').fill('10');
  await page.getByRole('button', { name: 'Generate Schedule' }).click();
  await expect(
    page.getByRole('heading', { name: 'Schedule Results' })
  ).toBeVisible();
  await expect(page.locator('#results-section')).toContainText(
    /FEASIBLE|OPTIMAL/
  );
  expect(backendRequests).toEqual([]);
});
