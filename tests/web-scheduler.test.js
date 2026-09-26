import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCpSatModel,
  mapCpSatResponse,
  normalizePairs,
} from '../src/services/cpSatScheduler.js';

function expressionNode(value) {
  return value instanceof FakeExpression
    ? value.node
    : { type: 'constant', value };
}

class FakeExpression {
  constructor(node) {
    this.node = node;
  }

  plus(value) {
    return new FakeExpression({
      type: 'plus',
      left: this.node,
      right: expressionNode(value),
    });
  }

  minus(value) {
    return new FakeExpression({
      type: 'minus',
      left: this.node,
      right: expressionNode(value),
    });
  }

  eq(value) {
    return new FakeExpression({
      type: 'eq',
      left: this.node,
      right: expressionNode(value),
    });
  }

  le(value) {
    return new FakeExpression({
      type: 'le',
      left: this.node,
      right: expressionNode(value),
    });
  }

  ge(value) {
    return new FakeExpression({
      type: 'ge',
      left: this.node,
      right: expressionNode(value),
    });
  }
}

class FakeVariable extends FakeExpression {
  constructor(name) {
    super({ type: 'variable', name });
    this.name = name;
  }
}

class FakeCpModel {
  constructor() {
    this.variables = [];
    this.constraints = [];
    this.objective = null;
  }

  newBoolVar(name) {
    const variable = new FakeVariable(name);
    this.variables.push(variable);
    return variable;
  }

  newIntVar(_lowerBound, _upperBound, name) {
    const variable = new FakeVariable(name);
    this.variables.push(variable);
    return variable;
  }

  addExactlyOne(variables) {
    this.constraints.push({
      type: 'exactlyOne',
      variables: variables.map((variable) => variable.name),
    });
  }

  addMaxEquality(target, variables) {
    this.constraints.push({
      type: 'maxEquality',
      target: target.name,
      variables: variables.map((variable) => variable.name),
    });
  }

  add(expression) {
    this.constraints.push({ type: 'linear', expression: expression.node });
  }

  maximize(expression) {
    this.objective = expression.node;
  }
}

const fakeCpSat = {
  CpModel: FakeCpModel,
  LinearExpr: {
    sum: (values) =>
      new FakeExpression({
        type: 'sum',
        values: values.map(expressionNode),
      }),
    term: (variable, coefficient) =>
      new FakeExpression({
        type: 'term',
        variable: variable.name,
        coefficient,
      }),
  },
};

function allNodes(value) {
  if (Array.isArray(value)) {
    return value.flatMap(allNodes);
  }
  if (value && typeof value === 'object') {
    return [value, ...Object.values(value).flatMap(allNodes)];
  }
  return [];
}

function hasVariable(expression, name) {
  return allNodes(expression).some(
    (node) => node.type === 'variable' && node.name === name
  );
}

function findAtMostOneConstraint(model, variableNames) {
  return model.constraints.find((constraint) => {
    const expression = constraint.expression;
    if (constraint.type !== 'linear' || expression?.type !== 'le') {
      return false;
    }
    return variableNames.every((name) => hasVariable(expression, name));
  });
}

function objectiveTerms(objective) {
  return allNodes(objective).filter((node) => node.type === 'term');
}

test('normalizes pairs using the Python scheduler rules', () => {
  assert.deepEqual(
    normalizePairs(
      [
        [4, 2],
        [2, 4],
        { u: 6, v: 5 },
        { u: 5, v: 6 },
        { u: 1, v: 1 },
        { u: 0, v: 1 },
        { u: 1, v: 7 },
        { left: 2, right: 3 },
        [3, 3],
        [0, 1],
        [-1, 2],
        [1, 7],
        null,
        [],
      ],
      6
    ),
    [
      [2, 4],
      [5, 6],
    ]
  );
});

test('constructs the required model constraints and weighted objective', () => {
  const modelData = buildCpSatModel(
    {
      participants: 6,
      tables: 2,
      rounds: 3,
      same_once_pairs: [
        [3, 5],
        [5, 3],
        [3, 5],
      ],
      never_together_pairs: [[3, 6]],
      time_limit_seconds: 4,
    },
    fakeCpSat
  );
  const model = modelData.model;

  assert.equal(
    model.constraints.filter((item) => item.type === 'exactlyOne').length,
    18
  );
  for (let participant = 1; participant <= 6; participant += 1) {
    for (let round = 0; round < 3; round += 1) {
      const constraint = model.constraints.find(
        (item) =>
          item.type === 'exactlyOne' &&
          item.variables.includes(`x_${participant}_t1_r${round}`)
      );
      assert.deepEqual(constraint?.variables, [
        `x_${participant}_t1_r${round}`,
        `x_${participant}_t2_r${round}`,
      ]);
    }
  }

  for (let host = 1; host <= 2; host += 1) {
    for (let round = 0; round < 3; round += 1) {
      for (let table = 1; table <= 2; table += 1) {
        const assignmentName = `x_${host}_t${table}_r${round}`;
        assert.ok(
          model.constraints.some((constraint) => {
            if (
              constraint.type !== 'linear' ||
              constraint.expression?.type !== 'eq'
            ) {
              return false;
            }
            return (
              hasVariable(constraint.expression, assignmentName) &&
              allNodes(constraint.expression).some(
                (node) =>
                  node.type === 'constant' &&
                  node.value === (host === table ? 1 : 0)
              )
            );
          }),
          `${assignmentName} should be fixed to its host table`
        );
      }
    }
  }

  for (let round = 0; round < 3; round += 1) {
    assert.ok(
      model.variables.some((variable) => variable.name === `min_size_r${round}`)
    );
    assert.ok(
      model.variables.some((variable) => variable.name === `max_size_r${round}`)
    );
    assert.ok(
      model.constraints.some(
        (constraint) =>
          constraint.type === 'linear' &&
          constraint.expression?.type === 'le' &&
          hasVariable(constraint.expression, `min_size_r${round}`) &&
          hasVariable(constraint.expression, `max_size_r${round}`) &&
          allNodes(constraint.expression).some(
            (node) => node.type === 'constant' && node.value === 1
          )
      ),
      `round ${round} should limit the largest table size to one above the smallest`
    );
  }

  const nonHostPairs = [
    [3, 4],
    [3, 5],
    [3, 6],
    [4, 5],
    [4, 6],
    [5, 6],
  ];
  for (const [left, right] of nonHostPairs) {
    const names = [];
    for (let table = 1; table <= 2; table += 1) {
      for (let round = 0; round < 3; round += 1) {
        names.push(`pair_u${left}_v${right}_t${table}_r${round}`);
      }
    }
    assert.ok(
      names.every((name) =>
        model.variables.some((variable) => variable.name === name)
      )
    );
    assert.ok(
      findAtMostOneConstraint(model, names),
      `pair ${left}/${right} should meet at most once globally`
    );
  }

  for (let round = 0; round < 3; round += 1) {
    for (let table = 1; table <= 2; table += 1) {
      const constraint = findAtMostOneConstraint(model, [
        `x_3_t${table}_r${round}`,
        `x_6_t${table}_r${round}`,
      ]);
      assert.ok(
        constraint,
        `never-together pair 3/6 is hard-constrained in round ${round}`
      );
    }
  }

  const terms = objectiveTerms(model.objective);
  assert.ok(
    terms.some(
      (term) =>
        term.coefficient === 1000 && term.variable.startsWith('meet_i0_r')
    )
  );
  assert.ok(
    terms.some(
      (term) => term.coefficient === 1 && term.variable.startsWith('visited_p')
    )
  );
  assert.ok(
    terms.some(
      (term) =>
        term.coefficient === 5 && term.variable.startsWith('pair_host_used_p')
    )
  );
});

test('constructs a real v0.9.1 CpModel without starting the WASM solver', async () => {
  const cpSatApi = await import('or-tools-wasm/cp-sat');
  const modelData = buildCpSatModel(
    {
      participants: 6,
      tables: 2,
      rounds: 3,
      same_once_pairs: [[3, 5]],
      never_together_pairs: [[4, 6]],
    },
    cpSatApi
  );
  const proto = modelData.model.proto();

  assert.equal(modelData.model.hasObjective(), true);
  assert.equal(
    proto.constraints.filter((constraint) => constraint.exactlyOne).length,
    18
  );
  assert.equal(modelData.globalPairVars.size, 6);
  const variableIndexByName = new Map(
    proto.variables.map((variable, index) => [variable.name, index])
  );
  for (const [pairKey, pairVariables] of modelData.globalPairVars) {
    const indexes = pairVariables.map((variable) =>
      variableIndexByName.get(variable.name)
    );
    assert.ok(
      proto.constraints.some((constraint) => {
        const linear = constraint.linear;
        return linear && indexes.every((index) => linear.vars.includes(index));
      }),
      `real CpModel should have a global uniqueness constraint for ${pairKey}`
    );
  }
  assert.ok(proto.objective.coeffs.includes(-1000));
  assert.ok(proto.objective.coeffs.includes(-1));
  assert.ok(proto.objective.coeffs.includes(-5));
});

test('maps a feasible solution to the Python response field contract', () => {
  const input = {
    participants: 6,
    tables: 2,
    rounds: 3,
    same_once_pairs: [
      [3, 5],
      [5, 6],
    ],
    never_together_pairs: [],
  };
  const modelData = buildCpSatModel(input, fakeCpSat);
  const schedule = [
    [
      [1, 3, 4],
      [2, 5, 6],
    ],
    [
      [1, 3, 5],
      [2, 4, 6],
    ],
    [
      [1, 3, 6],
      [2, 4, 5],
    ],
  ];
  const selectedAssignments = new Map();
  for (let round = 0; round < schedule.length; round += 1) {
    for (
      let tableIndex = 0;
      tableIndex < schedule[round].length;
      tableIndex += 1
    ) {
      for (
        let participant = 1;
        participant <= input.participants;
        participant += 1
      ) {
        selectedAssignments.set(
          modelData.x[participant][tableIndex + 1][round],
          schedule[round][tableIndex].includes(participant) ? 1 : 0
        );
      }
    }
  }
  const solver = {
    statusName: () => 'OPTIMAL',
    value: (variable) => selectedAssignments.get(variable) ?? 0,
    objectiveValue: () => 2012,
  };

  const result = mapCpSatResponse(input, modelData, solver, 'OPTIMAL');
  assert.deepEqual(
    Object.keys(result).sort(),
    [
      'participants',
      'tables',
      'rounds',
      'table_sizes',
      'table_sizes_per_round',
      'assignments',
      'satisfied_same_once_pairs',
      'unsatisfied_same_once_pairs',
      'never_together_violations',
      'objective_value',
      'solver_status',
    ].sort()
  );
  assert.equal(result.participants, 6);
  assert.equal(result.tables, 2);
  assert.equal(result.rounds, 3);
  assert.deepEqual(result.table_sizes, [3, 3]);
  assert.deepEqual(result.table_sizes_per_round, [
    [3, 3],
    [3, 3],
    [3, 3],
  ]);
  assert.deepEqual(result.assignments, schedule);
  assert.deepEqual(result.satisfied_same_once_pairs, [
    [3, 5],
    [5, 6],
  ]);
  assert.deepEqual(result.unsatisfied_same_once_pairs, []);
  assert.deepEqual(result.never_together_violations, []);
  assert.equal(result.objective_value, 2012);
  assert.equal(result.solver_status, 'OPTIMAL');
});

test('maps no-solution statuses without reading a missing solution or objective', () => {
  const input = {
    participants: 4,
    tables: 2,
    rounds: 2,
    same_once_pairs: [[3, 4]],
    never_together_pairs: [],
  };
  const modelData = buildCpSatModel(input, fakeCpSat);
  const solver = {
    statusName: () => 'INFEASIBLE',
    value: () => assert.fail('no solution values should be requested'),
    objectiveValue: () =>
      assert.fail('objective is undefined without a solution'),
  };

  const result = mapCpSatResponse(input, modelData, solver, 'INFEASIBLE');
  assert.equal(result.solver_status, 'INFEASIBLE');
  assert.equal(result.objective_value, 0);
  assert.deepEqual(result.assignments, []);
  assert.deepEqual(result.table_sizes_per_round, []);
  assert.deepEqual(result.satisfied_same_once_pairs, []);
  assert.deepEqual(result.unsatisfied_same_once_pairs, [[3, 4]]);
  assert.deepEqual(result.never_together_violations, []);
});
