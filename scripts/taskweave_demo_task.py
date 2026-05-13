from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path


def log(event: str, **fields: object) -> None:
    payload = {
        "time": datetime.now().isoformat(timespec="seconds"),
        "event": event,
        **fields,
    }
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="TaskWeave demo task")
    parser.add_argument("--name", default=os.getenv("TASKWEAVE_DEMO_NAME", "TaskWeave demo"))
    parser.add_argument("--steps", type=int, default=5)
    parser.add_argument("--sleep", type=float, default=1.0)
    parser.add_argument("--fail", action="store_true")
    parser.add_argument("--write-file", action="store_true")
    args = parser.parse_args()

    cwd = Path.cwd()
    log(
        "started",
        name=args.name,
        cwd=str(cwd),
        python=sys.version.split()[0],
        executable=sys.executable,
    )

    print("This line is stdout: the task is running normally.", flush=True)
    print("This line is stderr: use it to verify error-log capture.", file=sys.stderr, flush=True)

    for index in range(1, args.steps + 1):
        log("progress", step=index, total=args.steps)
        time.sleep(args.sleep)

    if args.write_file:
        output_path = cwd / "taskweave_demo_output.txt"
        output_path.write_text(
            f"TaskWeave demo completed at {datetime.now().isoformat(timespec='seconds')}\n",
            encoding="utf-8",
        )
        log("file_written", path=str(output_path))

    if args.fail:
        print("Intentional failure requested by --fail.", file=sys.stderr, flush=True)
        log("failed", exit_code=2)
        return 2

    log("finished", exit_code=0)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
