#! vpython3
import os
import subprocess
import shlex
import sys
from pathlib import Path
from typing import Iterable

repo_root = Path(__file__).absolute().parent
WORKLOAD_ROOT = repo_root / 'public'

def sh(cwd : Path, cmd: Iterable[str]) -> None:
  """Runs a command in a given directory."""
  print(f"Running '{shlex.join(cmd)}' in '{cwd}'")
  subprocess.check_call(cmd, cwd=cwd)


def build_webai_compute_benchmark():
  """Builds all versions of the webai-compute-benchmark workload."""
  print("Building webai-compute-benchmark...")
  webai_workload_dir = WORKLOAD_ROOT / 'webai-compute-benchmark'
  for version_dir in webai_workload_dir.glob("*"):
    if not version_dir.is_dir():
      continue

    if not (version_dir / 'package.json').exists():
      continue

    sh(version_dir, ['npm', 'ci'])
    sh(version_dir, ['npm', 'run', 'build'])
  print("Done building webai-compute-benchmark.")

def main():
  """Checks for and builds workloads that require a build step."""
  build_webai_compute_benchmark()

if __name__ == '__main__':
  sys.exit(main())
