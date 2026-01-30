#! vpython3
import os
import subprocess
import sys
from pathlib import Path


def run_command(cwd, cmd):
  """Runs a command in a given directory."""
  print(f"Running '{' '.join(cmd)}' in '{cwd}'")
  subprocess.check_call(cmd, cwd=cwd)


def main():
  """Checks for and builds workloads that require a build step."""
  # The script is in the root of the web-workload checkout.
  repo_root = Path(__file__).absolute().parent
  webai_benchmark_dir = repo_root / 'public' / 'webai-compute-benchmark' / 'main'

  if (webai_benchmark_dir / 'package.json').exists():
    print("Building webai-compute-benchmark...")
    # Use the public npm registry to avoid issues with internal registries.
    run_command(webai_benchmark_dir, ['npm', 'install', '--registry=https://registry.npmjs.org/'])
    run_command(webai_benchmark_dir, ['npm', 'run', 'build'])
    print("Done building webai-compute-benchmark.")

if __name__ == '__main__':
  sys.exit(main())
