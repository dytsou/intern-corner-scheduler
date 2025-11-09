from typing import List, Tuple, Dict, Any

from ortools.sat.python import cp_model


def compute_table_sizes(num_participants: int, num_tables: int) -> List[int]:
    base = num_participants // num_tables
    rem = num_participants % num_tables
    return [base + 1 if t < rem else base for t in range(num_tables)]


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

    # Normalize pairs: ensure (min,max), remove duplicates and invalid
    def _norm_pairs(pairs: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
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

    same_once_pairs = _norm_pairs(same_once_pairs)
    never_together_pairs = _norm_pairs(never_together_pairs)

    # Pre-calc table sizes and host ids
    table_sizes = compute_table_sizes(num_participants, num_tables)
    host_ids = list(range(1, num_tables + 1))

    model = cp_model.CpModel()

    # Decision vars: x[p][t][r] in {0,1}
    x = {}
    for p in range(1, num_participants + 1):
        for t in range(1, num_tables + 1):
            for r in range(num_rounds):
                x[(p, t, r)] = model.NewBoolVar(f"x_p{p}_t{t}_r{r}")

    # One table per participant per round
    for p in range(1, num_participants + 1):
        for r in range(num_rounds):
            model.Add(sum(x[(p, t, r)] for t in range(1, num_tables + 1)) == 1)

    # No fixed per-table capacities: allow variable table sizes per round
    # But keep per-round balance: max size - min size <= 1
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
        # Constrain spread
        model.Add(max_size[r] - min_size[r] <= 1)

    # Hosts fixed: participant h sits at table h every round
    for h in host_ids:
        for r in range(num_rounds):
            for t in range(1, num_tables + 1):
                if t == h:
                    model.Add(x[(h, t, r)] == 1)
                else:
                    model.Add(x[(h, t, r)] == 0)

    # Never together: for each r,t, x[u,t,r] + x[v,t,r] <= 1
    for (u, v) in never_together_pairs:
        for r in range(num_rounds):
            for t in range(1, num_tables + 1):
                model.Add(x[(u, t, r)] + x[(v, t, r)] <= 1)

    # Same-once linearization variables and objective parts
    z = {}  # z[i,t,r] indicates pair i shares table t in round r
    meet = {}  # meet[i,r] = OR_t z[i,t,r]
    meet_host = {}  # meet_host[i,h] = OR_r z[i,h,r]
    for i, (u, v) in enumerate(same_once_pairs):
        for r in range(num_rounds):
            meet_var = model.NewBoolVar(f"meet_i{i}_r{r}")
            meet[(i, r)] = meet_var
            z_vars = []
            for t in range(1, num_tables + 1):
                z_var = model.NewBoolVar(f"z_i{i}_t{t}_r{r}")
                z[(i, t, r)] = z_var
                # z <= x[u,t,r]; z <= x[v,t,r]; z >= x[u,t,r] + x[v,t,r] - 1
                model.Add(z_var <= x[(u, t, r)])
                model.Add(z_var <= x[(v, t, r)])
                model.Add(z_var >= x[(u, t, r)] + x[(v, t, r)] - 1)
                z_vars.append(z_var)
            # meet == OR(z_vars)
            model.AddMaxEquality(meet_var, z_vars)
        # meet_host over hosts
        for h in range(1, num_tables + 1):
            mh = model.NewBoolVar(f"meet_host_i{i}_h{h}")
            meet_host[(i, h)] = mh
            model.AddMaxEquality(mh, [z[(i, h, r)] for r in range(num_rounds)])
        # At most once across all rounds
        model.Add(sum(meet[(i, r)] for r in range(num_rounds)) <= 1)

    # Global pairwise uniqueness for non-host pairs only: guests should not sit together twice
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
            # At most one round where they meet
            model.Add(sum(meet_uv_round) <= 1)

    # Host diversity preference: encourage guests to visit different hosts across rounds
    visited_any = {}
    for p in range(num_tables + 1, num_participants + 1):
        for h in range(1, num_tables + 1):
            vph = model.NewBoolVar(f"visited_p{p}_h{h}")
            visited_any[(p, h)] = vph
            model.AddMaxEquality(vph, [x[(p, h, r)] for r in range(num_rounds)])

    # Distinct-host preference for pair meetings per participant
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

    # Objective: weighted sum (prioritize same-once satisfaction, then host diversity)
    alpha = 1000
    beta = 1
    gamma = 5
    model.Maximize(
        alpha * sum(meet[(i, r)] for i in range(len(same_once_pairs)) for r in range(num_rounds))
        + beta * sum(visited_any[(p, h)] for p in range(num_tables + 1, num_participants + 1) for h in range(1, num_tables + 1))
        + gamma * sum(distinct_pair_host[(p, h)] for (p, h) in distinct_pair_host)
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(time_limit_seconds)
    solver.parameters.num_search_workers = 8

    status = solver.Solve(model)

    assignments: List[List[List[int]]]
    assignments = []
    for r in range(num_rounds):
        round_tables: List[List[int]] = [[] for _ in range(num_tables)]
        for t in range(1, num_tables + 1):
            for p in range(1, num_participants + 1):
                if solver.Value(x[(p, t, r)]) == 1:
                    round_tables[t - 1].append(p)
            round_tables[t - 1].sort()
        assignments.append(round_tables)

    # Compute per-round table sizes
    table_sizes_per_round: List[List[int]] = []
    for r in range(num_rounds):
        table_sizes_per_round.append([len(assignments[r][t]) for t in range(num_tables)])

    # Post-check and stats
    satisfied_same_once = []
    unsatisfied_same_once = []
    for i, (u, v) in enumerate(same_once_pairs):
        count = 0
        for r in range(num_rounds):
            if solver.Value(meet[(i, r)]) == 1:
                count += 1
        if count == 1:
            satisfied_same_once.append([u, v])
        else:
            unsatisfied_same_once.append([u, v])

    never_violations = []
    for (u, v) in never_together_pairs:
        viol = False
        for r in range(num_rounds):
            for t in range(1, num_tables + 1):
                if solver.Value(x[(u, t, r)]) == 1 and solver.Value(x[(v, t, r)]) == 1:
                    viol = True
                    break
            if viol:
                break
        if viol:
            never_violations.append([u, v])

    status_str = solver.StatusName(status) if hasattr(solver, "StatusName") else str(status)
    objective_value = int(solver.ObjectiveValue()) if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else 0

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
