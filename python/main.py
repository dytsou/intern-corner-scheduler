import sys
import json
from typing import List, Tuple

from scheduler import schedule


def parse_stdin() -> Tuple[int, int, int, List[Tuple[int, int]], List[Tuple[int, int]]]:
    data = sys.stdin.read().strip().split()
    if len(data) < 3:
        raise ValueError("Expected at least three integers: a b c")
    ptr = 0

    def next_int() -> int:
        nonlocal ptr
        if ptr >= len(data):
            raise ValueError("Unexpected end of input")
        try:
            val = int(data[ptr])
        except ValueError as e:
            raise ValueError(f"Invalid integer at position {ptr}: {data[ptr]}") from e
        ptr += 1
        return val

    a = next_int()
    b = next_int()
    c = next_int()

    d = next_int()
    same_pairs: List[Tuple[int, int]] = []
    for _ in range(d):
        u = next_int()
        v = next_int()
        same_pairs.append((u, v))

    x = next_int()
    never_pairs: List[Tuple[int, int]] = []
    for _ in range(x):
        y = next_int()
        z = next_int()
        never_pairs.append((y, z))

    return a, b, c, same_pairs, never_pairs


def parse_interactive() -> Tuple[int, int, int, List[Tuple[int, int]], List[Tuple[int, int]]]:
    # Prompts go to stderr to avoid polluting JSON stdout
    sys.stderr.write("Enter 'a b c' (participants tables rounds):\n")
    sys.stderr.flush()
    while True:
        line = sys.stdin.readline()
        parts = line.strip().split()
        if len(parts) == 3:
            try:
                a, b, c = map(int, parts)
                break
            except Exception:
                pass
        sys.stderr.write("Invalid. Please enter three integers: a b c\n")
        sys.stderr.flush()

    sys.stderr.write("Enter d (number of 'same-once' pairs):\n")
    sys.stderr.flush()
    while True:
        line = sys.stdin.readline().strip()
        try:
            d = int(line)
            break
        except Exception:
            sys.stderr.write("Invalid. Enter an integer for d.\n")
            sys.stderr.flush()

    same_pairs: List[Tuple[int, int]] = []
    if d > 0:
        sys.stderr.write(f"Enter {d} lines of 'e f' pairs for same-once:\n")
        sys.stderr.flush()
        for _ in range(d):
            while True:
                line = sys.stdin.readline().strip().split()
                if len(line) == 2:
                    try:
                        u, v = int(line[0]), int(line[1])
                        same_pairs.append((u, v))
                        break
                    except Exception:
                        pass
                sys.stderr.write("Invalid. Enter two integers: e f\n")
                sys.stderr.flush()

    sys.stderr.write("Enter x (number of 'never-together' pairs):\n")
    sys.stderr.flush()
    while True:
        line = sys.stdin.readline().strip()
        try:
            x = int(line)
            break
        except Exception:
            sys.stderr.write("Invalid. Enter an integer for x.\n")
            sys.stderr.flush()

    never_pairs: List[Tuple[int, int]] = []
    if x > 0:
        sys.stderr.write(f"Enter {x} lines of 'y z' pairs for never-together:\n")
        sys.stderr.flush()
        for _ in range(x):
            while True:
                line = sys.stdin.readline().strip().split()
                if len(line) == 2:
                    try:
                        y, z = int(line[0]), int(line[1])
                        never_pairs.append((y, z))
                        break
                    except Exception:
                        pass
                sys.stderr.write("Invalid. Enter two integers: y z\n")
                sys.stderr.flush()

    return a, b, c, same_pairs, never_pairs


def main() -> None:
    try:
        # If running interactively, guide the user with prompts.
        if sys.stdin.isatty():
            a, b, c, same_pairs, never_pairs = parse_interactive()
        else:
            a, b, c, same_pairs, never_pairs = parse_stdin()
        print("start scheduler")
        result = schedule(a, b, c, same_pairs, never_pairs)
        print(json.dumps(result, separators=(",", ":")))
    except Exception as exc:
        print(json.dumps({
            "error": str(exc)
        }), file=sys.stdout)
        sys.exit(1)


if __name__ == "__main__":
    main()
