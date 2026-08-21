#!/usr/bin/env python3
"""
Extract execution-specs into the JSON shape the spec viewer consumes.

consensus-specs builds its own spec object, so that side just dumps it (see
write_pyspec_dict.patch). execution-specs has no equivalent: it is plain Python
packages under src/ethereum/forks/<fork>/, so this walks the source with `ast`
and emits the same {network: {fork: {category: {name: source}}}} shape.

Item names are qualified with their module path (`vm.gas.charge_gas`) because
a bare name is not unique within a fork - `pop` exists in both vm.stack and
vm.instructions.stack.

Usage:
    extract_execution_specs.py <execution-specs-checkout> <output.json>
"""

import ast
import json
import re
import sys
from pathlib import Path

# execution-specs has no mainnet/minimal split; the viewer expects a network
# key, so everything lives under a single one.
NETWORK = "mainnet"

# Ordering of unscheduled forks is given relative to each other, after every
# fork that already has a block number or timestamp.
SCHEDULED_BY_BLOCK = 0
SCHEDULED_BY_TIME = 1
UNSCHEDULED = 2


def fork_sort_key(fork_dir):
    """
    Build a sort key from the fork's FORK_CRITERIA declaration.

    Forks activate by block number, then by timestamp, then are unscheduled
    with an explicit order_index. Reading the declaration keeps this script
    correct as forks are added, rather than hardcoding a list that goes stale.
    """
    source = (fork_dir / "__init__.py").read_text()
    match = re.search(r"FORK_CRITERIA\s*(?::[^=]+)?=\s*(.+)", source)
    if not match:
        return (UNSCHEDULED, float("inf"), fork_dir.name)

    criteria = match.group(1)
    number = re.search(r"\(\s*(?:order_index\s*=\s*)?([0-9_]+)\s*\)", criteria)
    value = int(number.group(1).replace("_", "")) if number else float("inf")

    if "ByBlockNumber" in criteria:
        tier = SCHEDULED_BY_BLOCK
    elif "ByTimestamp" in criteria:
        tier = SCHEDULED_BY_TIME
    else:
        tier = UNSCHEDULED

    return (tier, value, fork_dir.name)


def module_prefix(py_file, fork_dir):
    """
    Dotted module path of a file relative to its fork, minus the fork itself.

    The fork's own __init__.py gets no prefix, so its contents read as
    top-level names.
    """
    relative = py_file.relative_to(fork_dir).with_suffix("")
    parts = [p for p in relative.parts if p != "__init__"]
    return ".".join(parts)


def is_callable_binding(node):
    """
    Whether an assignment binds a callable rather than a value.

    The EVM instruction modules define opcodes like `push1` and `log0` by
    partially applying a helper, so they are functions in everything but
    syntax and belong with the other instructions.
    """
    annotation = getattr(node, "annotation", None)
    if annotation is not None and "Callable" in ast.unparse(annotation):
        return True

    value = node.value
    return (
        isinstance(value, ast.Call)
        and isinstance(value.func, ast.Name)
        and value.func.id == "partial"
    )


def categorize_assignment(name, node):
    """Sort a module-level binding into a viewer category."""
    if is_callable_binding(node):
        return "functions"
    if name.isupper():
        return "constant_vars"
    if name[:1].isupper():
        return "custom_types"
    return "constant_vars"


def extract_fork(fork_dir):
    """Collect every top-level definition in a fork, keyed by category."""
    categories = {
        "functions": {},
        "dataclasses": {},
        "classes": {},
        "custom_types": {},
        "constant_vars": {},
    }

    for py_file in sorted(fork_dir.rglob("*.py")):
        source = py_file.read_text()
        lines = source.split("\n")
        tree = ast.parse(source, filename=str(py_file))
        prefix = module_prefix(py_file, fork_dir)

        def qualify(name):
            return f"{prefix}.{name}" if prefix else name

        def segment(node):
            return "\n".join(lines[node.lineno - 1 : node.end_lineno])

        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                categories["functions"][qualify(node.name)] = segment(node)

            elif isinstance(node, ast.ClassDef):
                decorators = " ".join(ast.unparse(d) for d in node.decorator_list)
                bucket = "dataclasses" if "dataclass" in decorators else "classes"
                categories[bucket][qualify(node.name)] = segment(node)

            elif isinstance(node, (ast.Assign, ast.AnnAssign)):
                targets = (
                    node.targets if isinstance(node, ast.Assign) else [node.target]
                )
                for target in targets:
                    # Dunders like __all__ are packaging detail, not spec
                    if not isinstance(target, ast.Name):
                        continue
                    if target.id.startswith("__"):
                        continue
                    bucket = categorize_assignment(target.id, node)
                    categories[bucket][qualify(target.id)] = segment(node)

    return {name: items for name, items in categories.items() if items}


def main():
    if len(sys.argv) != 3:
        print(__doc__.strip(), file=sys.stderr)
        return 2

    checkout = Path(sys.argv[1])
    output = Path(sys.argv[2])

    forks_root = checkout / "src" / "ethereum" / "forks"
    if not forks_root.is_dir():
        print(f"error: no fork packages at {forks_root}", file=sys.stderr)
        return 1

    fork_dirs = sorted(
        (d for d in forks_root.iterdir() if d.is_dir() and (d / "__init__.py").exists()),
        key=fork_sort_key,
    )

    # The viewer reads this rather than hardcoding a fork list that would go
    # stale every time a fork is added.
    result = {
        "forkOrder": [d.name.upper() for d in fork_dirs],
        NETWORK: {d.name: extract_fork(d) for d in fork_dirs},
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w") as handle:
        json.dump(result, handle)

    total = sum(
        len(items)
        for fork in result[NETWORK].values()
        for items in fork.values()
    )
    print(f"wrote {output}: {len(fork_dirs)} forks, {total} items")
    print(f"fork order: {' -> '.join(result['forkOrder'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
