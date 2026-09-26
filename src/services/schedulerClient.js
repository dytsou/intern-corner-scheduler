import { solveSchedule } from './cpSatScheduler.js';

let activeSolve = null;

function createCancellationError() {
  const error = new Error('Schedule generation was cancelled.');
  error.name = 'AbortError';
  return error;
}

export async function solveScheduleLocally(input, { onStatus } = {}) {
  if (activeSolve) {
    throw new Error('A browser schedule solve is already in progress.');
  }

  let finishSolve;
  const solve = {
    cancelRequested: false,
    cpSatApi: null,
    solvePromise: null,
    finished: new Promise((resolve) => {
      finishSolve = resolve;
    }),
    finish: () => finishSolve(),
  };
  activeSolve = solve;

  try {
    if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
      throw new Error(
        'This page needs cross-origin isolation to load the browser solver.'
      );
    }

    const cpSatApi = await import('or-tools-wasm/cp-sat');
    solve.cpSatApi = cpSatApi;
    if (solve.cancelRequested) {
      throw createCancellationError();
    }

    if (!cpSatApi.CpSat.isWorkerBridgeEnabled()) {
      cpSatApi.CpSat.setWorkerBridgeEnabled(true);
    }
    if (!cpSatApi.CpSat.isWorkerBridgeEnabled()) {
      throw new Error('The OR-Tools browser worker bridge is unavailable.');
    }

    solve.solvePromise = solveSchedule(input, { cpSatApi });
    onStatus?.('solving');
    const result = await solve.solvePromise;
    if (solve.cancelRequested) {
      throw createCancellationError();
    }
    return result;
  } catch (error) {
    if (solve.cancelRequested) {
      throw createCancellationError();
    }
    throw error;
  } finally {
    try {
      if (
        solve.cancelRequested &&
        solve.cpSatApi &&
        !solve.cpSatApi.CpSat.isWorkerBridgeEnabled()
      ) {
        solve.cpSatApi.CpSat.setWorkerBridgeEnabled(true);
      }
    } finally {
      if (activeSolve === solve) {
        activeSolve = null;
      }
      solve.finish();
    }
  }
}

export async function cancelScheduleSolve() {
  const solve = activeSolve;
  if (!solve) return false;

  if (!solve.cancelRequested) {
    solve.cancelRequested = true;
    if (solve.solvePromise && solve.cpSatApi.CpSat.isWorkerBridgeEnabled()) {
      try {
        solve.cpSatApi.CpSat.setWorkerBridgeEnabled(false);
      } catch (error) {
        solve.cancelRequested = false;
        throw error;
      }
    }
  }

  await solve.finished;
  return true;
}
