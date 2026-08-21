#!/usr/bin/env python3
"""
Maintain a spec repository's versions.json.

The file is a list of {"version", "date"} objects ordered newest first, where
the date is the commit each version was built from. The viewer renders the list
in exactly this order, so ordering lives here rather than in the browser - the
two repositories name their versions too differently to compare there
(v1.7.0-alpha.14 against tests-glamsterdam-devnet@v8.1.1).

Entries are kept in step with the directories actually present, so a version
that has been pruned drops out automatically.

Usage:
    update_versions.py <repo-dir> [version=ISO8601 ...]
"""

import json
import sys
from pathlib import Path


def main():
    if len(sys.argv) < 2:
        print(__doc__.strip(), file=sys.stderr)
        return 2

    repo_dir = Path(sys.argv[1])
    if not repo_dir.is_dir():
        print(f"error: {repo_dir} is not a directory", file=sys.stderr)
        return 1

    versions_file = repo_dir / "versions.json"

    # Start from what is already recorded, so dates survive for versions this
    # run did not rebuild
    dates = {}
    if versions_file.exists():
        for entry in json.loads(versions_file.read_text()):
            if isinstance(entry, dict) and "version" in entry:
                dates[entry["version"]] = entry.get("date")

    for pair in sys.argv[2:]:
        version, _, date = pair.partition("=")
        if not date:
            print(f"error: expected version=date, got {pair!r}", file=sys.stderr)
            return 1
        dates[version] = date

    present = sorted(d.name for d in repo_dir.iterdir() if d.is_dir())

    missing = [v for v in present if not dates.get(v)]
    if missing:
        print(
            f"error: no date recorded for {', '.join(missing)}; "
            "pass it as version=ISO8601",
            file=sys.stderr,
        )
        return 1

    entries = sorted(
        ({"version": v, "date": dates[v]} for v in present),
        key=lambda e: e["date"],
        reverse=True,
    )

    versions_file.write_text(json.dumps(entries, indent=2) + "\n")
    print(f"wrote {versions_file}: {len(entries)} versions")
    for entry in entries[:3]:
        print(f"   {entry['date']}  {entry['version']}")
    if len(entries) > 3:
        print(f"   ... and {len(entries) - 3} more")
    return 0


if __name__ == "__main__":
    sys.exit(main())
