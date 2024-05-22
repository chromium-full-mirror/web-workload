# This file is used to manage the dependencies. It is
# used by gclient to determine what version of each dependency to check out, and
# where.
#
# For more information, please refer to the official documentation:
#   https://sites.google.com/a/chromium.org/dev/developers/how-tos/get-the-code
#
# When adding a new dependency, please update the top-level .gitignore file
# to list the dependency's destination directory.
#
# -----------------------------------------------------------------------------
# Rolling deps
# -----------------------------------------------------------------------------
# All repositories in this file are git-based, using Chromium git mirrors where
# necessary (e.g., a git mirror is used when the source project is SVN-based).
# To update the revision that Chromium pulls for a given dependency:
#
#  # Create and switch to a new branch
#  git new-branch depsroll
#  # Run roll-dep (provided by depot_tools) giving the dep's path and optionally
#  # a regex that will match the line in this file that contains the current
#  # revision. The script ALWAYS rolls the dependency to the latest revision
#  # in origin/master. The path for the dep should start with src/.
#  roll-dep src/third_party/foo_package/src foo_package.git
#  # You should now have a modified DEPS file; commit and upload as normal
#  git commit -aspv_he
#  git cl upload
#
# For more on the syntax and semantics of this file, see:
#   https://bit.ly/chromium-gclient-conditionals
#
# which is a bit incomplete but the best documentation we have at the
# moment.

# We expect all git dependencies specified in this file to be in sync with git
# submodules (gitlinks).
git_dependencies = 'SYNC'

vars = {
  'chromium_speedometer_git': 'https://chromium.googlesource.com/external/github.com/WebKit/Speedometer.git',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v3.0
  # and whatever else without interference from each other.
  'speedometer_3.0_revision': '8d67f28d0281ac4330f283495b7f48286654ad7d',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v3.0-custom
  # and whatever else without interference from each other.
  'speedometer_3.0-custom_revision': '9384787e42afd4c595f9a163d9547e7b1d065061',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v2.1
  # and whatever else without interference from each other.
  'speedometer_2.1_revision': '8bf7946e39e47c875c00767177197aea5727e84a',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v2.1-custom
  # and whatever else without interference from each other.
  'speedometer_2.1-custom_revision': '7a0d00f97d88ae3a7cde6f8b4e735c0e6d28ece9',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v2.0
  # and whatever else without interference from each other.
  'speedometer_2.0_revision': '732af0dfe867f8815e662ac637357e55f285dbbb',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v2.0
  # and whatever else without interference from each other.
  'chromium_jetstream_git': 'https://chromium.googlesource.com/external/github.com/WebKit/JetStream.git',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v3.0-custom
  # and whatever else without interference from each other.
  'jetstream_2.2_revision': '2145cedef4ca2777b792cb0059d3400ee2a6153c',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v2.1
  # and whatever else without interference from each other.
  'jetstream_2.1_revision': '86a447c24c5bedb04cd824948f65fead8ce62f91',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v2.1-custom
  # and whatever else without interference from each other.
  'jetstream_2.0_revision': '3ec5dc3e622cedf143ced6f35492d192530f340d',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v2.0
  # and whatever else without interference from each other.
  'jetstream_1.1_revision': '9405dd1b7abe75e373c08d09e6f7956b40537724',
}

# Only these hosts are allowed for dependencies in this DEPS file.
# If you need to add a new host, contact chrome infrastructure team.
allowed_hosts = [
  'chromium.googlesource.com',
]

deps = {
  # Speedometer Variants:
  'src/public/speedometer/v3.0':
    Var('chromium_speedometer_git') + '@' + Var('speedometer_3.0_revision'),
  'src/public/speedometer/v3.0-custom':
    Var('chromium_speedometer_git') + '@' + Var('speedometer_3.0-custom_revision'),
  'src/public/speedometer/v2.1':
    Var('chromium_speedometer_git') + '@' + Var('speedometer_2.1_revision'),
  'src/public/speedometer/v2.1-custom':
    Var('chromium_speedometer_git') + '@' + Var('speedometer_2.1-custom_revision'),
  'src/public/speedometer/v2.0':
    Var('chromium_speedometer_git') + '@' + Var('speedometer_2.0_revision'),
  # JetStream Variants:
  'src/public/jetstream/v2.2':
    Var('chromium_jetstream_git') + '@' + Var('jetstream_2.2_revision'),
  'src/public/jetstream/v2.1m':
    Var('chromium_jetstream_git') + '@' + Var('jetstream_2.1_revision'),
  'src/public/jetstream/v2.0':
    Var('chromium_jetstream_git') + '@' + Var('jetstream_2.0_revision'),
  'src/public/jetstream/v1.1':
    Var('chromium_jetstream_git') + '@' + Var('jetstream_1.1_revision'),
}