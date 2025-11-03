#! vpython3
import argparse
import enum
from pathlib import Path
import shlex
import subprocess
import sys
import textwrap
import urllib.request
import urllib.error

CANDIDATES = ("chr", "chrome", "chromium")


def find_chrome_checkout(start: Path):
  for parent in start.absolute().parents:
    for candidate_name in CANDIDATES:
      candidate = parent / candidate_name / "src/tools/perf/cb"
      print(candidate)
      if candidate.exists():
        return candidate
  return None


SCRIPT_PATH = Path(__file__).absolute()
DEFAULT_CROSSBENCH_BIN = find_chrome_checkout(SCRIPT_PATH.parents[1])


class TestMode(enum.StrEnum):
  FAST = "fast"
  DEFAULT = "default"
  COMPLETE = "complete"


def main():
  parser = argparse.ArgumentParser(
      description="Test server interaction with optional crossbench execution.")
  url_group = parser.add_argument_group("URL")
  url_exclusive_group = url_group.add_mutually_exclusive_group(required=True)
  url_exclusive_group.add_argument("--url", help="URL for the test server")
  url_exclusive_group.add_argument(
      "url_pos", nargs='?', help="URL for the test server")

  crossbench_group = parser.add_argument_group("Crossbench")
  crossbench_exclusive_group = crossbench_group.add_mutually_exclusive_group()
  crossbench_exclusive_group.add_argument(
      "crossbench_bin_pos",
      nargs='?',
      type=Path,
      help=f"Path to the crossbench binary",
      default=DEFAULT_CROSSBENCH_BIN)
  crossbench_exclusive_group.add_argument(
      "--crossbench",
      "--cb",
      dest="crossbench_bin",
      type=Path,
      help=f"Path to the crossbench binary , default={DEFAULT_CROSSBENCH_BIN}")

  test_mode_group = parser.add_argument_group(
      "Test Mode",
      textwrap.dedent(""""
        There are 3 test modes,
        where --default provides the best test to duration ratio.
        In all modes workloads are configured for functional testing rather
        than accurate performance numbers. Concretely we lower the total
        iteration count and avoid slow sanity checks.
      """))
  test_mode_exclusive_group = test_mode_group.add_mutually_exclusive_group()
  test_mode_exclusive_group.add_argument(
      "--fast",
      help=("Select a fast subset of stories "
            "for all workloads for quick testing."),
      dest="test_mode",
      action="store_const",
      const=TestMode.FAST,
      default=TestMode.DEFAULT)
  test_mode_exclusive_group.add_argument(
      "--default",
      help=("Select a fast subset of stories for non-stable workloads, "
            "and all stories for the stable versions."),
      dest="test_mode",
      action="store_const",
      const=TestMode.DEFAULT,
  )
  test_mode_exclusive_group.add_argument(
      "--complete",
      "--slow",
      help=("Select all stories for all workload versions "
            "for exhaustive testing."),
      dest="test_mode",
      action="store_const",
      const=TestMode.COMPLETE)

  args = parser.parse_args()
  url = args.url or args.url_pos
  crossbench_bin = args.crossbench_bin or args.crossbench_bin_pos

  def fail(message):
    print(message)
    print()
    parser.print_usage()
    sys.exit(1)

  if not crossbench_bin:
    fail("Could not find crossbench. "
         "Please explicitly provide a path to go/crossbench.")

  if not crossbench_bin.exists():
    fail(f"{crossbench_bin} does not exist.")

  if not url:
    fail("Missing stage/deployment URL")

  if not is_url_reachable(url):
    fail(f"URL {repr(url)} is not reachable.")

  run_tests(url, crossbench_bin, args.test_mode)


def is_url_reachable(url):
  try:
    with urllib.request.urlopen(url) as response:
      return True
  except (urllib.error.URLError, ValueError):
    return False


def split_version_string(value: str):
  return tuple(map(int, value.split(".")))


RED = "\033[31m"
YELLOW = "\033[33m"
RESET = "\033[0m"


def sh(*cmds):
  print(YELLOW, shlex.join(map(str, cmds)), RESET)
  process = subprocess.Popen(
      cmds,
      stdout=subprocess.PIPE,
      stderr=subprocess.PIPE,
  )
  stdout, stderr = process.communicate()
  if process.returncode != 0:
    print(f"{RED}FAILURE:")
    print("STDOUT:")
    print(stdout.decode("utf-8").strip())
    print("STDERR:")
    print(stderr.decode("utf-8").strip())
    print(RESET)
    sys.exit(process.returncode)


def run_tests(url: str, crossbench_bin: Path, test_mode: TestMode):
  test_speedometer(url, crossbench_bin, test_mode)
  test_jetstream(url, crossbench_bin, test_mode)
  # TODO(cbruni): enable motionmark once crossbench stories selection is fixed on 1.3
  # test_motionmark(url, crossbench_bin, test_mode)
  # TODO(cbruni): add DOM ops workload
  # TODO(cbruni): add memory workload test


SPEEDOMETER_VERSIONS = (
    ("2.1", "v2.0"),
    ("2.1", "v2.1"),
    ("2.1", "v2.1-custom"),
    ("3.0", "v3.0"),
    ("3.0", "v3.0-custom"),
    ("3.1", "v3.1"),
    ("3.1", "v3.1-custom"),
    ("main", "main"),
    ("main", "main-custom"),
)
SPEEDOMETER_STABLE_PATH = "v3.0"


def test_speedometer(url, crossbench_bin, test_mode: TestMode):
  print("SPEEDOMETER:")
  for version, path in SPEEDOMETER_VERSIONS:
    extra_args = []
    if test_mode == TestMode.FAST:
      extra_args = ["--stories=.*React.*"]
    elif test_mode == TestMode.DEFAULT and path == SPEEDOMETER_STABLE_PATH:
      # Run the complete stable version.
      pass

    sh(crossbench_bin, f"speedometer_{version}",
       f"--url={url}/speedometer/{path}", "--fast", "--iterations=1",
       *extra_args)


JETSTREAM_VERSIONS = (
    # v1.1 is not supported by crossbench.
    # ("1.1", "v1.1"),
    ("2.1", "v2.1"),
    ("2.1", "v2.1-custom"),
    ("2.2", "v2.2"),
    ("2.2", "v2.2-custom"),
    ("main", "main"),
)
JETSTREAM_STABLE_PATH = "v2.2"


def test_jetstream(url, crossbench_bin, test_mode: TestMode):
  print("JETSTREAM:")
  for version, path in JETSTREAM_VERSIONS:
    extra_args = []
    if test_mode == TestMode.FAST:
      extra_args = ["--stories=.*richards.*"]
    elif test_mode == TestMode.DEFAULT:
      # TODO(cbruni): create fast preflight testing for the stable version.
      # Run the complete stable version.
      if path != JETSTREAM_STABLE_PATH:
        extra_args = ["--stories=.*richards.*"]

    sh(crossbench_bin, f"jetstream_{version}", f"--url={url}/jetstream/{path}",
       "--fast", *extra_args)


MOTIONMARK_VERSIONS_FAST = (("1.3.1", "v1.3.1"),)
MOTIONMARK_VERSIONS_DEFAULT = (
    ("1.3", "v1.3"),
    # TODO(cbruni): enable main once available in crossbench
    # ("main", "main"),
) + MOTIONMARK_VERSIONS_FAST
MOTIONMARK_VERSIONS_COMPLETE = (
    ("1.0", "v1.0"),
    ("1.1", "v1.1"),
    ("1.2", "v1.2"),
) + MOTIONMARK_VERSIONS_DEFAULT
MOTIONMARK_STABLE_VERSION = "v1.3.1"


def test_motionmark(url, crossbench_bin, test_mode: TestMode):
  print("MOTIONMARK:")
  # Motionmark is too slow, let's only use a minimal version subset
  # https://crbug.com/400746865 hopefully will address this.
  versions = MOTIONMARK_VERSIONS_DEFAULT
  if test_mode is TestMode.FAST:
    versions = MOTIONMARK_VERSIONS_FAST
  elif test_mode is TestMode.COMPLETE:
    versions = MOTIONMARK_VERSIONS_COMPLETE
  versions = sorted(versions, key=lambda pair: split_version_string(pair[0]))

  extra_args = []
  # TODO(cbruni): create fast preflight testing for the stable version
  if test_mode in (TestMode.FAST, TestMode.DEFAULT):
    extra_args = ["--stories=.*Canvas Arc.*"]
  for version, path in versions:
    sh(crossbench_bin, f"motionmark_{version}",
       f"--url={url}/motionmark/{path}", "--fast", *extra_args)


if __name__ == "__main__":
  main()
