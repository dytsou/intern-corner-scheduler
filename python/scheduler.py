from typing import List, Tuple, Dict, Any

from ortools.sat.python import cp_model


def compute_table_sizes(num_participants: int, num_tables: int) -> List[int]:
    base = num_participants // num_tables
    rem = num_participants % num_tables
    return [base + 1 if t < rem else base for t in range(num_tables)]


def _normalize_pairs(
    pairs: List[Tuple[int, int]], num_participants: int
) -> List[Tuple[int, int]]:
    seen = set()
    out: List[Tuple[int, int]] = []
    for u, v in pairs:
        if u == v:
            continue
        if not (1 <= u <= num_participants and 1 <= v <= num_participants):
            continue
        a, b = (u, v) if u < v else (v, u)
        key = (a, b)
        if key in seen:
            continue
        seen.add(key)
        out.append(key)
    return out


def _build_decision_vars(model, num_participants, num_tables, num_rounds):
    x = {}
    for p in range(1, num_participants + 1):
        for t in range(1, num_tables + 1):
            for r in range(num_rounds):
                x[(p, t, r)] = model.NewBoolVar(f"x_p{p}_t{t}_r{r}")
    return x


def _add_one_table_per_round(model, x, num_participants, num_tables, num_rounds):
    for p in range(1, num_participants + 1):
        for r in range(num_rounds):
            model.Add(sum(x[(p, t, r)] for t in range(1, num_tables + 1)) == 1)


def _add_table_balance(model, x, num_participants, num_tables, num_rounds):
    size = {}
    min_size = {}
    max_size = {}
    for r in range(num_rounds):
        min_size[r] = model.NewIntVar(0, num_participants, f"min_size_r{r}")
        max_size[r] = model.NewIntVar(0, num_participants, f"max_size_r{r}")
        for t in range(1, num_tables + 1):
            cnt = model.NewIntVar(0, num_participants, f"size_t{t}_r{r}")
            size[(t, r)] = cnt
            model.Add(cnt == sum(x[(p, t, r)] for p in range(1, num_participants + 1)))
            model.Add(cnt >= min_size[r])
            model.Add(cnt <= max_size[r])
        model.Add(max_size[r] - min_size[r] <= 1)
    return size


def _add_host_fixed(model, x, num_tables, num_rounds):
    for h in range(1, num_tables + 1):
        for r in range(num_rounds):
            for t in range(1, num_tables + 1):
                if t == h:
                    model.Add(x[(h, t, r)] == 1)
                else:
                    model.Add(x[(h, t, r)] == 0)


def _add_never_together(model, x, never_together_pairs, num_tables, num_rounds):
    for (u, v) in never_together_pairs:
        for r in range(num_rounds):
            for t in range(1, num_tables + 1):
                model.Add(x[(u, t, r)] + x[(v, t, r)] <= 1)


def _add_same_once(model, x, same_once_pairs, num_tables, num_rounds):
    z = {}
    meet = {}
    meet_host = {}
    for i, (u, v) in enumerate(same_once_pairs):
        for r in range(num_rounds):
            meet_var = model.NewBoolVar(f"meet_i{i}_r{r}")
            meet[(i, r)] = meet_var
            z_vars = []
            for t in range(1, num_tables + 1):
                z_var = model.NewBoolVar(f"z_i{i}_t{t}_r{r}")
                z[(i, t, r)] = z_var
                model.Add(z_var <= x[(u, t, r)])
                model.Add(z_var <= x[(v, t, r)])
                model.Add(z_var >= x[(u, t, r)] + x[(v, t, r)] - 1)
                z_vars.append(z_var)
            model.AddMaxEquality(meet_var, z_vars)
        for h in range(1, num_tables + 1):
            mh = model.NewBoolVar(f"meet_host_i{i}_h{h}")
            meet_host[(i, h)] = mh
            model.AddMaxEquality(mh, [z[(i, h, r)] for r in range(num_rounds)])
        model.Add(sum(meet[(i, r)] for r in range(num_rounds)) <= 1)
    return z, meet, meet_host


def _add_global_pairwise_unique(model, x, num_participants, num_tables, num_rounds):
    for u in range(num_tables + 1, num_participants + 1):
        for v in range(u + 1, num_participants + 1):
            meet_uv_round = []
            for r in range(num_rounds):
                z_vars = []
                for t in range(1, num_tables + 1):
                    z_var = model.NewBoolVar(f"pair_u{u}_v{v}_t{t}_r{r}")
                    model.Add(z_var <= x[(u, t, r)])
                    model.Add(z_var <= x[(v, t, r)])
                    model.Add(z_var >= x[(u, t, r)] + x[(v, t, r)] - 1)
                    z_vars.append(z_var)
                meet_r = model.NewBoolVar(f"meet_u{u}_v{v}_r{r}")
                model.AddMaxEquality(meet_r, z_vars)
                meet_uv_round.append(meet_r)
            model.Add(sum(meet_uv_round) <= 1)


def _add_host_diversity_vars(model, x, num_participants, num_tables, num_rounds, same_once_pairs, meet_host):
    visited_any = {}
    for p in range(num_tables + 1, num_participants + 1):
        for h in range(1, num_tables + 1):
            vph = model.NewBoolVar(f"visited_p{p}_h{h}")
            visited_any[(p, h)] = vph
            model.AddMaxEquality(vph, [x[(p, h, r)] for r in range(num_rounds)])

    pairs_by_participant: Dict[int, List[int]] = {p: [] for p in range(1, num_participants + 1)}
    for i, (u, v) in enumerate(same_once_pairs):
        pairs_by_participant[u].append(i)
        pairs_by_participant[v].append(i)

    distinct_pair_host = {}
    for p in range(1, num_participants + 1):
        idxs = pairs_by_participant[p]
        if not idxs:
            continue
        for h in range(1, num_tables + 1):
            var_list = [meet_host[(i, h)] for i in idxs if (i, h) in meet_host]
            if not var_list:
                continue
            y = model.NewBoolVar(f"pair_host_used_p{p}_h{h}")
            distinct_pair_host[(p, h)] = y
            model.AddMaxEquality(y, var_list)
    return visited_any, distinct_pair_host


def _extract_assignments(solver, x, num_participants, num_tables, num_rounds):
    assignments = []
    for r in range(num_rounds):
        round_tables: List[List[int]] = [[] for _ in range(num_tables)]
        for t in range(1, num_tables + 1):
            for p in range(1, num_participants + 1):
                if solver.Value(x[(p, t, r)]) == 1:
                    round_tables[t - 1].append(p)
            round_tables[t - 1].sort()
        assignments.append(round_tables)
    return assignments


def _compute_same_once_stats(solver, meet, same_once_pairs, num_rounds):
    satisfied: List[List[int]] = []
    unsatisfied: List[List[int]] = []
    for i, (u, v) in enumerate(same_once_pairs):
        count = 0
        for r in range(num_rounds):
            if solver.Value(meet[(i, r)]) == 1:
                count += 1
        if count == 1:
            satisfied.append([u, v])
        else:
            unsatisfied.append([u, v])
    return satisfied, unsatisfied


def _pair_violates(solver, x, u, v, num_tables, num_rounds) -> bool:
    for r in range(num_rounds):
        for t in range(1, num_tables + 1):
            if solver.Value(x[(u, t, r)]) == 1 and solver.Value(x[(v, t, r)]) == 1:
                return True
    return False


def _compute_never_violations(solver, x, never_together_pairs, num_tables, num_rounds):
    violations: List[List[int]] = []
    for (u, v) in never_together_pairs:
        if _pair_violates(solver, x, u, v, num_tables, num_rounds):
            violations.append([u, v])
    return violations


def schedule(
    num_participants: int,
    num_tables: int,
    num_rounds: int,
    same_once_pairs: List[Tuple[int, int]],
    never_together_pairs: List[Tuple[int, int]],
    time_limit_seconds: int = 60,
) -> Dict[str, Any]:
    # Indices: participants 1..a; tables 1..b; rounds 0..c-1
    assert num_participants >= num_tables > 0
    assert num_rounds > 0

    same_once_pairs = _normalize_pairs(same_once_pairs, num_participants)
    never_together_pairs = _normalize_pairs(never_together_pairs, num_participants)

    table_sizes = compute_table_sizes(num_participants, num_tables)

    model = cp_model.CpModel()
    x = _build_decision_vars(model, num_participants, num_tables, num_rounds)
    _add_one_table_per_round(model, x, num_participants, num_tables, num_rounds)
    _add_table_balance(model, x, num_participants, num_tables, num_rounds)
    _add_host_fixed(model, x, num_tables, num_rounds)
    _add_never_together(model, x, never_together_pairs, num_tables, num_rounds)
    _, meet, meet_host = _add_same_once(model, x, same_once_pairs, num_tables, num_rounds)
    _add_global_pairwise_unique(model, x, num_participants, num_tables, num_rounds)
    visited_any, distinct_pair_host = _add_host_diversity_vars(
        model, x, num_participants, num_tables, num_rounds, same_once_pairs, meet_host
    )

    # Objective: weighted sum (prioritize same-once satisfaction, then host diversity)
    alpha = 1000
    beta = 1
    gamma = 5
    model.Maximize(
        alpha * sum(meet[(i, r)] for i in range(len(same_once_pairs)) for r in range(num_rounds))
        + beta * sum(
            visited_any[(p, h)]
            for p in range(num_tables + 1, num_participants + 1)
            for h in range(1, num_tables + 1)
        )
        + gamma * sum(distinct_pair_host[(p, h)] for (p, h) in distinct_pair_host)
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(time_limit_seconds)
    solver.parameters.num_search_workers = 8

    status = solver.Solve(model)

    assignments = _extract_assignments(solver, x, num_participants, num_tables, num_rounds)
    table_sizes_per_round = [
        [len(assignments[r][t]) for t in range(num_tables)] for r in range(num_rounds)
    ]
    satisfied_same_once, unsatisfied_same_once = _compute_same_once_stats(
        solver, meet, same_once_pairs, num_rounds
    )
    never_violations = _compute_never_violations(
        solver, x, never_together_pairs, num_tables, num_rounds
    )

    status_str = solver.StatusName(status) if hasattr(solver, "StatusName") else str(status)
    objective_value = (
        int(solver.ObjectiveValue())
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        else 0
    )

    return {
        "participants": num_participants,
        "tables": num_tables,
        "rounds": num_rounds,
        "table_sizes": table_sizes,
        "table_sizes_per_round": table_sizes_per_round,
        "assignments": assignments,
        "satisfied_same_once_pairs": satisfied_same_once,
        "unsatisfied_same_once_pairs": unsatisfied_same_once,
        "never_together_violations": never_violations,
        "objective_value": objective_value,
        "solver_status": status_str,
    }
