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


def get_git_head(cwd: Path) -> str:
  return subprocess.check_output(
      ['git', 'rev-parse', 'HEAD'], cwd=cwd, text=True).strip()


def get_expected_submodule_hash(version_dir: Path) -> str | None:
  rel_path = version_dir.relative_to(repo_root)
  output = subprocess.check_output(
      ['git', 'ls-files', '-s', rel_path], cwd=repo_root, text=True).strip()
  if not output:
    return None
  # Output format: "<mode> <hash> <stage>\t<path>"
  return output.split()[1]


def is_already_built(version_dir: Path, head_hash: str) -> bool:
  build_info_file = version_dir / 'resources' / 'build-info.mjs'
  if not build_info_file.exists():
    return False
  content = build_info_file.read_text(encoding='utf-8')
  if f'"gitHash": "{head_hash}"' not in content:
    return False
  lfs_files = subprocess.check_output(
      ['git', 'ls-files', ':(attr:filter=lfs)'],
      cwd=version_dir,
      text=True).splitlines()
  for rel_file in lfs_files:
    lfs_path = version_dir / rel_file.strip()
    if not lfs_path.exists() or lfs_path.stat().st_size < 1024:
      return False
  return True


def build_webai_compute_benchmark():
  """Builds all versions of the webai-compute-benchmark workload."""
  print("Building webai-compute-benchmark...")
  webai_workload_dir = WORKLOAD_ROOT / 'webai-compute-benchmark'
  for version_dir in webai_workload_dir.glob("*"):
    if not version_dir.is_dir():
      continue

    if not (version_dir / 'package.json').exists():
      continue

    head_hash = get_git_head(version_dir)
    expected_hash = get_expected_submodule_hash(version_dir)
    if expected_hash and head_hash != expected_hash:
      print(
          f"Error: '{version_dir}' is checked out at {head_hash[:7]}, "
          f"but DEPS expects {expected_hash[:7]}. "
          f"Please run 'gclient sync' first.",
          file=sys.stderr)
      sys.exit(1)

    if is_already_built(version_dir, head_hash):
      print(f"Skipping '{version_dir}': already built for {head_hash[:7]}.")
      continue

    sh(version_dir, ['npm', 'ci'])
    sh(version_dir, ['npm', 'run', 'build'])
  print("Done building webai-compute-benchmark.")

def main():
  """Checks for and builds workloads that require a build step."""
  build_webai_compute_benchmark()

if __name__ == '__main__':
  sys.exit(main())
