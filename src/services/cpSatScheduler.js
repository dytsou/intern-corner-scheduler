const SOLUTION_STATUSES = new Set(['OPTIMAL', 'FEASIBLE']);

export function normalizePairs(pairs, participants) {
  if (!Array.isArray(pairs)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];
  for (const pair of pairs) {
    const endpoints =
      Array.isArray(pair) && pair.length === 2
        ? pair
        : pair &&
            typeof pair === 'object' &&
            !Array.isArray(pair) &&
            Object.hasOwn(pair, 'u') &&
            Object.hasOwn(pair, 'v')
          ? [pair.u, pair.v]
          : null;
    if (!endpoints) {
      continue;
    }

    const [left, right] = endpoints;
    if (
      !Number.isSafeInteger(left) ||
      !Number.isSafeInteger(right) ||
      left === right ||
      left < 1 ||
      right < 1 ||
      left > participants ||
      right > participants
    ) {
      continue;
    }

    const normalizedPair = left < right ? [left, right] : [right, left];
    const key = `${normalizedPair[0]}:${normalizedPair[1]}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(normalizedPair);
  }

  return normalized;
}

function readDimensions(input) {
  const participants = Number(input.participants);
  const tables = Number(input.tables);
  const rounds = Number(input.rounds);

  if (!Number.isSafeInteger(participants) || !Number.isSafeInteger(tables)) {
    throw new TypeError('participants and tables must be integers');
  }
  if (!Number.isSafeInteger(rounds)) {
    throw new TypeError('rounds must be an integer');
  }
  if (participants < tables || tables < 1 || rounds < 1) {
    throw new RangeError(
      'participants must be at least tables, and tables and rounds must be positive'
    );
  }

  return { participants, tables, rounds };
}

function computeTableSizes(participants, tables) {
  const base = Math.floor(participants / tables);
  const remainder = participants % tables;
  return Array.from(
    { length: tables },
    (_value, tableIndex) => base + (tableIndex < remainder ? 1 : 0)
  );
}

function makeVariableGrid(participants, tables, rounds) {
  return Array.from({ length: participants + 1 }, () =>
    Array.from({ length: tables + 1 }, () => Array(rounds))
  );
}

function addConjunction(model, name, left, right) {
  const together = model.newBoolVar(name);
  model.add(together.le(left));
  model.add(together.le(right));
  model.add(together.ge(left.plus(right).minus(1)));
  return together;
}

function addTableBalance(model, LinearExpr, x, participants, tables, rounds) {
  const sizes = Array.from({ length: tables + 1 }, () => Array(rounds));
  const minSizes = Array(rounds);
  const maxSizes = Array(rounds);

  for (let round = 0; round < rounds; round += 1) {
    minSizes[round] = model.newIntVar(0, participants, `min_size_r${round}`);
    maxSizes[round] = model.newIntVar(0, participants, `max_size_r${round}`);

    for (let table = 1; table <= tables; table += 1) {
      const count = model.newIntVar(
        0,
        participants,
        `size_t${table}_r${round}`
      );
      sizes[table][round] = count;
      model.add(
        LinearExpr.sum(
          Array.from(
            { length: participants },
            (_value, index) => x[index + 1][table][round]
          )
        ).eq(count)
      );
      model.add(count.ge(minSizes[round]));
      model.add(count.le(maxSizes[round]));
    }

    model.add(maxSizes[round].minus(minSizes[round]).le(1));
  }

  return sizes;
}

function addSameOnce(model, LinearExpr, x, sameOncePairs, tables, rounds) {
  const togetherByPairAndTableRound = new Map();
  const meetByPairAndRound = [];
  const meetByPairAndHost = new Map();

  for (let pairIndex = 0; pairIndex < sameOncePairs.length; pairIndex += 1) {
    const [left, right] = sameOncePairs[pairIndex];
    const meetThisPairByRound = [];

    for (let round = 0; round < rounds; round += 1) {
      const tableVars = [];
      for (let table = 1; table <= tables; table += 1) {
        const together = addConjunction(
          model,
          `same_once_pair_i${pairIndex}_t${table}_r${round}`,
          x[left][table][round],
          x[right][table][round]
        );
        togetherByPairAndTableRound.set(
          `${pairIndex}:${table}:${round}`,
          together
        );
        tableVars.push(together);
      }

      const meet = model.newBoolVar(`meet_i${pairIndex}_r${round}`);
      model.addMaxEquality(meet, tableVars);
      meetThisPairByRound.push(meet);
    }

    model.add(LinearExpr.sum(meetThisPairByRound).le(1));
    meetByPairAndRound.push(meetThisPairByRound);

    for (let host = 1; host <= tables; host += 1) {
      const meetHost = model.newBoolVar(`meet_host_i${pairIndex}_h${host}`);
      model.addMaxEquality(
        meetHost,
        Array.from({ length: rounds }, (_value, round) =>
          togetherByPairAndTableRound.get(`${pairIndex}:${host}:${round}`)
        )
      );
      meetByPairAndHost.set(`${pairIndex}:${host}`, meetHost);
    }
  }

  return { meetByPairAndRound, meetByPairAndHost };
}

function addGlobalPairwiseUnique(
  model,
  LinearExpr,
  x,
  participants,
  tables,
  rounds
) {
  const togetherByPair = new Map();

  for (let left = tables + 1; left <= participants; left += 1) {
    for (let right = left + 1; right <= participants; right += 1) {
      const pairVars = [];
      for (let table = 1; table <= tables; table += 1) {
        for (let round = 0; round < rounds; round += 1) {
          pairVars.push(
            addConjunction(
              model,
              `pair_u${left}_v${right}_t${table}_r${round}`,
              x[left][table][round],
              x[right][table][round]
            )
          );
        }
      }
      model.add(LinearExpr.sum(pairVars).le(1));
      togetherByPair.set(`${left}:${right}`, pairVars);
    }
  }

  return togetherByPair;
}

function addHostDiversity(
  model,
  x,
  sameOncePairs,
  meetByPairAndHost,
  participants,
  tables,
  rounds
) {
  const visitedAny = new Map();
  for (
    let participant = tables + 1;
    participant <= participants;
    participant += 1
  ) {
    for (let host = 1; host <= tables; host += 1) {
      const visited = model.newBoolVar(`visited_p${participant}_h${host}`);
      model.addMaxEquality(
        visited,
        Array.from(
          { length: rounds },
          (_value, round) => x[participant][host][round]
        )
      );
      visitedAny.set(`${participant}:${host}`, visited);
    }
  }

  const pairIndexesByParticipant = new Map();
  for (let pairIndex = 0; pairIndex < sameOncePairs.length; pairIndex += 1) {
    for (const participant of sameOncePairs[pairIndex]) {
      const indexes = pairIndexesByParticipant.get(participant) ?? [];
      indexes.push(pairIndex);
      pairIndexesByParticipant.set(participant, indexes);
    }
  }

  const distinctPairHost = new Map();
  for (const [participant, pairIndexes] of pairIndexesByParticipant) {
    for (let host = 1; host <= tables; host += 1) {
      const pairHostVars = pairIndexes.map((pairIndex) =>
        meetByPairAndHost.get(`${pairIndex}:${host}`)
      );
      if (pairHostVars.length === 0) {
        continue;
      }

      const pairHostUsed = model.newBoolVar(
        `pair_host_used_p${participant}_h${host}`
      );
      model.addMaxEquality(pairHostUsed, pairHostVars);
      distinctPairHost.set(`${participant}:${host}`, pairHostUsed);
    }
  }

  return { visitedAny, distinctPairHost };
}

export function buildCpSatModel(input, cpSatApi) {
  if (!cpSatApi?.CpModel || !cpSatApi?.LinearExpr) {
    throw new TypeError('buildCpSatModel requires CpModel and LinearExpr');
  }

  const { participants, tables, rounds } = readDimensions(input);
  const sameOncePairs = normalizePairs(input.same_once_pairs, participants);
  const neverTogetherPairs = normalizePairs(
    input.never_together_pairs,
    participants
  );
  const model = new cpSatApi.CpModel();
  const x = makeVariableGrid(participants, tables, rounds);

  for (let participant = 1; participant <= participants; participant += 1) {
    for (let table = 1; table <= tables; table += 1) {
      for (let round = 0; round < rounds; round += 1) {
        x[participant][table][round] = model.newBoolVar(
          `x_${participant}_t${table}_r${round}`
        );
      }
    }
  }

  for (let participant = 1; participant <= participants; participant += 1) {
    for (let round = 0; round < rounds; round += 1) {
      model.addExactlyOne(
        Array.from(
          { length: tables },
          (_value, index) => x[participant][index + 1][round]
        )
      );
    }
  }

  const tableSizeVars = addTableBalance(
    model,
    cpSatApi.LinearExpr,
    x,
    participants,
    tables,
    rounds
  );

  for (let host = 1; host <= tables; host += 1) {
    for (let round = 0; round < rounds; round += 1) {
      for (let table = 1; table <= tables; table += 1) {
        model.add(x[host][table][round].eq(table === host ? 1 : 0));
      }
    }
  }

  for (const [left, right] of neverTogetherPairs) {
    for (let round = 0; round < rounds; round += 1) {
      for (let table = 1; table <= tables; table += 1) {
        model.add(x[left][table][round].plus(x[right][table][round]).le(1));
      }
    }
  }

  const { meetByPairAndRound, meetByPairAndHost } = addSameOnce(
    model,
    cpSatApi.LinearExpr,
    x,
    sameOncePairs,
    tables,
    rounds
  );
  const globalPairVars = addGlobalPairwiseUnique(
    model,
    cpSatApi.LinearExpr,
    x,
    participants,
    tables,
    rounds
  );
  const { visitedAny, distinctPairHost } = addHostDiversity(
    model,
    x,
    sameOncePairs,
    meetByPairAndHost,
    participants,
    tables,
    rounds
  );

  const objectiveTerms = [];
  for (const meetVars of meetByPairAndRound) {
    for (const variable of meetVars) {
      objectiveTerms.push(cpSatApi.LinearExpr.term(variable, 1000));
    }
  }
  for (const variable of visitedAny.values()) {
    objectiveTerms.push(cpSatApi.LinearExpr.term(variable, 1));
  }
  for (const variable of distinctPairHost.values()) {
    objectiveTerms.push(cpSatApi.LinearExpr.term(variable, 5));
  }
  model.maximize(
    objectiveTerms.length === 0
      ? cpSatApi.LinearExpr.constant(0)
      : cpSatApi.LinearExpr.sum(objectiveTerms)
  );

  return {
    model,
    x,
    tableSizeVars,
    tableSizes: computeTableSizes(participants, tables),
    participants,
    tables,
    rounds,
    sameOncePairs,
    neverTogetherPairs,
    globalPairVars,
    meetByPairAndRound,
    meetByPairAndHost,
    visitedAny,
    distinctPairHost,
  };
}

function hasSolution(status) {
  return SOLUTION_STATUSES.has(status);
}

function pairSharesTable(assignments, left, right, round) {
  return assignments[round].some(
    (table) => table.includes(left) && table.includes(right)
  );
}

export function mapCpSatResponse(input, modelData, solver, status) {
  const solverStatus =
    typeof solver.statusName === 'function'
      ? solver.statusName(status)
      : String(status);
  const resultHasSolution = hasSolution(solverStatus);
  const assignments = [];

  if (resultHasSolution) {
    for (let round = 0; round < modelData.rounds; round += 1) {
      const roundTables = Array.from({ length: modelData.tables }, () => []);
      for (let table = 1; table <= modelData.tables; table += 1) {
        for (
          let participant = 1;
          participant <= modelData.participants;
          participant += 1
        ) {
          if (
            Number(solver.value(modelData.x[participant][table][round])) === 1
          ) {
            roundTables[table - 1].push(participant);
          }
        }
      }
      assignments.push(roundTables);
    }
  }

  const tableSizesPerRound = assignments.map((roundTables) =>
    roundTables.map((table) => table.length)
  );
  const satisfiedSameOncePairs = [];
  const unsatisfiedSameOncePairs = [];
  const neverTogetherViolations = [];

  for (const pair of modelData.sameOncePairs) {
    const [left, right] = pair;
    const meetingCount = assignments.reduce(
      (count, _roundTables, round) =>
        count + Number(pairSharesTable(assignments, left, right, round)),
      0
    );
    (meetingCount === 1
      ? satisfiedSameOncePairs
      : unsatisfiedSameOncePairs
    ).push(pair);
  }

  if (resultHasSolution) {
    for (const pair of modelData.neverTogetherPairs) {
      const [left, right] = pair;
      if (
        assignments.some((_roundTables, round) =>
          pairSharesTable(assignments, left, right, round)
        )
      ) {
        neverTogetherViolations.push(pair);
      }
    }
  } else {
    unsatisfiedSameOncePairs.splice(
      0,
      unsatisfiedSameOncePairs.length,
      ...modelData.sameOncePairs
    );
  }

  return {
    participants: modelData.participants,
    tables: modelData.tables,
    rounds: modelData.rounds,
    table_sizes: modelData.tableSizes,
    table_sizes_per_round: tableSizesPerRound,
    assignments,
    satisfied_same_once_pairs: satisfiedSameOncePairs,
    unsatisfied_same_once_pairs: unsatisfiedSameOncePairs,
    never_together_violations: neverTogetherViolations,
    objective_value: resultHasSolution
      ? Math.trunc(solver.objectiveValue())
      : 0,
    solver_status: solverStatus,
  };
}

export async function solveSchedule(input, { cpSatApi } = {}) {
  const api = cpSatApi ?? (await import('or-tools-wasm/cp-sat'));
  const modelData = buildCpSatModel(input, api);
  const solver = new api.CpSolver();
  const timeLimitSeconds = Number(input.time_limit_seconds ?? 60);
  if (!Number.isSafeInteger(timeLimitSeconds) || timeLimitSeconds < 1) {
    throw new RangeError('time_limit_seconds must be a positive integer');
  }
  solver.parameters.maxTimeInSeconds = timeLimitSeconds;
  solver.parameters.numSearchWorkers = 1;

  const status = await solver.solve(modelData.model);
  return mapCpSatResponse(input, modelData, solver, status);
}
