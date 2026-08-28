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


def _read_int(prompt: str, invalid_msg: str) -> int:
    sys.stderr.write(prompt)
    sys.stderr.flush()
    while True:
        line = sys.stdin.readline().strip()
        try:
            return int(line)
        except Exception:
            sys.stderr.write(invalid_msg)
            sys.stderr.flush()


def _read_three_ints(prompt: str, invalid_msg: str) -> Tuple[int, int, int]:
    sys.stderr.write(prompt)
    sys.stderr.flush()
    while True:
        parts = sys.stdin.readline().strip().split()
        if len(parts) == 3:
            try:
                a, b, c = map(int, parts)
                return a, b, c
            except Exception:
                pass
        sys.stderr.write(invalid_msg)
        sys.stderr.flush()


def _read_pair(prompt: str, invalid_msg: str) -> Tuple[int, int]:
    sys.stderr.write(prompt)
    sys.stderr.flush()
    while True:
        parts = sys.stdin.readline().strip().split()
        if len(parts) == 2:
            try:
                u, v = int(parts[0]), int(parts[1])
                return u, v
            except Exception:
                pass
        sys.stderr.write(invalid_msg)
        sys.stderr.flush()


def parse_interactive() -> Tuple[int, int, int, List[Tuple[int, int]], List[Tuple[int, int]]]:
    # Prompts go to stderr to avoid polluting JSON stdout
    a, b, c = _read_three_ints(
        "Enter 'a b c' (participants tables rounds):\n",
        "Invalid. Please enter three integers: a b c\n",
    )
    d = _read_int(
        "Enter d (number of 'same-once' pairs):\n",
        "Invalid. Enter an integer for d.\n",
    )
    same_pairs = [
        _read_pair(
            f"Enter {d} lines of 'e f' pairs for same-once:\n",
            "Invalid. Enter two integers: e f\n",
        )
        for _ in range(d)
    ]
    x = _read_int(
        "Enter x (number of 'never-together' pairs):\n",
        "Invalid. Enter an integer for x.\n",
    )
    never_pairs = [
        _read_pair(
            f"Enter {x} lines of 'y z' pairs for never-together:\n",
            "Invalid. Enter two integers: y z\n",
        )
        for _ in range(x)
    ]
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
