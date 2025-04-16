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

use_relative_paths = True

vars = {
  'chromium_speedometer_git': 'https://chromium.googlesource.com/external/github.com/WebKit/Speedometer.git',
  'chromium_jetstream_git': 'https://chromium.googlesource.com/external/github.com/WebKit/JetStream.git',
  'chromium_motionmark_git': 'https://chromium.googlesource.com/external/github.com/WebKit/MotionMark.git',
  'chromium_web_tests_git': 'https://chromium.googlesource.com/chromium/web-tests.git',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer main
  # and whatever else without interference from each other.
  'speedometer_main_revision': '1fa5234087a71f0c1000689020a5b77eb379b4d3',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer main-custom
  # and whatever else without interference from each other.
  'speedometer_main-custom_revision': 'f227c26c11e83f07c90c28c89a824f81db9d05c6',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v3.0
  # and whatever else without interference from each other.
  'speedometer_3.1_revision': '1386415be8fef2f6b6bbdbe1828872471c5d802a',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v3.0-custom
  # and whatever else without interference from each other.
  'speedometer_3.1-custom_revision': '115ae747164f853fdb1c88871f3b756f5e4844ce',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v3.0
  # and whatever else without interference from each other.
  'speedometer_3.0_revision': '8d67f28d0281ac4330f283495b7f48286654ad7d',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v3.0-custom
  # and whatever else without interference from each other.
  'speedometer_3.0-custom_revision': '4735260f42705d0f55a46e41ebf67d445ba690d6',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v2.1
  # and whatever else without interference from each other.
  'speedometer_2.1_revision': 'a1e842164bc1803be6afa658bbb1336ecc726b12',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v2.1-custom
  # and whatever else without interference from each other.
  'speedometer_2.1-custom_revision': '7a0d00f97d88ae3a7cde6f8b4e735c0e6d28ece9',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Speedometer v2.0
  # and whatever else without interference from each other.
  'speedometer_2.0_revision': '732af0dfe867f8815e662ac637357e55f285dbbb',

  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling JetStream v3.0-custom
  # and whatever else without interference from each other.
  'jetstream_main-custom_revision': 'd4820bdbee0417f5429478336333cfba9a0f0bab',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling JetStream v3.0-custom
  # and whatever else without interference from each other.
  'jetstream_main_revision': 'ed6dfc1d181e9003ad095d0fb914a8c961fc54da',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling JetStream v2.2-custom
  # and whatever else without interference from each other.
  'jetstream_2.2-custom_revision': '94028ddd5f7c5a220ecddff9fdba0400a7c7598f',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling JetStream v2.2
  # and whatever else without interference from each other.
  'jetstream_2.2_revision': '2145cedef4ca2777b792cb0059d3400ee2a6153c',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling JetStream v2.1-custom
  # and whatever else without interference from each other.
  'jetstream_2.1-custom_revision': 'fb25603d5ceba3df7f923e1d504af4ed0ba98a34',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling JetStream v2.1
  # and whatever else without interference from each other.
  'jetstream_2.1_revision': '86a447c24c5bedb04cd824948f65fead8ce62f91',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling JetStream v2.0-custom
  # and whatever else without interference from each other.
  'jetstream_2.0-custom_revision': '89222dc42940b31ff78a9fe4dc7716601078245f',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling JetStream v2.0
  # and whatever else without interference from each other.
  'jetstream_2.0_revision': '3ec5dc3e622cedf143ced6f35492d192530f340d',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling JetStream v2.0
  # and whatever else without interference from each other.
  'jetstream_1.1_revision': '9405dd1b7abe75e373c08d09e6f7956b40537724',

  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Motionmark v1.3.2
  # and whatever else without interference from each other.
  'motionmark_main_revision': '032f5037deeb280da265cd28d67ab78eb8620f24',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Motionmark v1.3.2
  # and whatever else without interference from each other.
  'motionmark_1.3.1_revision': 'be2a5fea89b6ef411b053ebeb95a6302b3dc0ecb',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Motionmark v1.3
  # and whatever else without interference from each other.
  'motionmark_1.3_revision': '5d9c88136d59c11daf78d539c73e4e3e88c091ab',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Motionmark v1.2
  # and whatever else without interference from each other.
  'motionmark_1.2_revision': '34a15d3669fc36592d9daaad9db05ebe4edb51d7',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Motionmark v1.1
  # and whatever else without interference from each other.
  'motionmark_1.1_revision': '10e6f72ad500ee30fdeed188c7e95b30e8da0619',
  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling Motionmark v1.0
  # and whatever else without interference from each other.
  'motionmark_1.0_revision': 'beeb2a45b34039ff57b5263147c1e0134a2b7738',

  # Three lines of non-changing comments so that
  # the commit queue can handle CLs rolling web-tests main
  # and whatever else without interference from each other.
  'web_tests_main_revision': 'bcb57d514e3a09222be397b5ff465a4cd9284314',
}

# Only these hosts are allowed for dependencies in this DEPS file.
# If you need to add a new host, contact chrome infrastructure team.
allowed_hosts = [
  'chromium.googlesource.com',
]

deps = {
  # Speedometer Variants:
  'public/speedometer/main':
    Var('chromium_speedometer_git') + '@' + Var('speedometer_main_revision'),
  'public/speedometer/main-custom':
    Var('chromium_speedometer_git') + '@' + Var('speedometer_main-custom_revision'),
  'public/speedometer/v3.1':
    Var('chromium_speedometer_git') + '@' + Var('speedometer_3.1_revision'),
  'public/speedometer/v3.1-custom':
    Var('chromium_speedometer_git') + '@' + Var('speedometer_3.1-custom_revision'),
  'public/speedometer/v3.0':
    Var('chromium_speedometer_git') + '@' + Var('speedometer_3.0_revision'),
  'public/speedometer/v3.0-custom':
    Var('chromium_speedometer_git') + '@' + Var('speedometer_3.0-custom_revision'),
  'public/speedometer/v2.1':
    Var('chromium_speedometer_git') + '@' + Var('speedometer_2.1_revision'),
  'public/speedometer/v2.1-custom':
    Var('chromium_speedometer_git') + '@' + Var('speedometer_2.1-custom_revision'),
  'public/speedometer/v2.0':
    Var('chromium_speedometer_git') + '@' + Var('speedometer_2.0_revision'),
  # JetStream Variants:
  'public/jetstream/main-custom':
    Var('chromium_jetstream_git') + '@' + Var('jetstream_main-custom_revision'),
  'public/jetstream/main':
    Var('chromium_jetstream_git') + '@' + Var('jetstream_main_revision'),
  'public/jetstream/v2.2-custom':
    Var('chromium_jetstream_git') + '@' + Var('jetstream_2.2-custom_revision'),
  'public/jetstream/v2.2':
    Var('chromium_jetstream_git') + '@' + Var('jetstream_2.2_revision'),
  'public/jetstream/v2.1-custom':
    Var('chromium_jetstream_git') + '@' + Var('jetstream_2.1-custom_revision'),
  'public/jetstream/v2.1':
    Var('chromium_jetstream_git') + '@' + Var('jetstream_2.1_revision'),
  'public/jetstream/v2.0-custom':
    Var('chromium_jetstream_git') + '@' + Var('jetstream_2.0-custom_revision'),
  'public/jetstream/v2.0':
    Var('chromium_jetstream_git') + '@' + Var('jetstream_2.0_revision'),
  'public/jetstream/v1.1':
    Var('chromium_jetstream_git') + '@' + Var('jetstream_1.1_revision'),
  # MotionMark Variants:
  'public/motionmark/main':
    Var('chromium_motionmark_git') + '@' + Var('motionmark_main_revision'),
  'public/motionmark/v1.3.1':
    Var('chromium_motionmark_git') + '@' + Var('motionmark_1.3.1_revision'),
  'public/motionmark/v1.3':
    Var('chromium_motionmark_git') + '@' + Var('motionmark_1.3_revision'),
  'public/motionmark/v1.2':
    Var('chromium_motionmark_git') + '@' + Var('motionmark_1.2_revision'),
  'public/motionmark/v1.1':
    Var('chromium_motionmark_git') + '@' + Var('motionmark_1.1_revision'),
  'public/motionmark/v1.0':
    Var('chromium_motionmark_git') + '@' + Var('motionmark_1.0_revision'),
  'public/web-tests/main':
    Var('chromium_web_tests_git') + '@' + Var('web_tests_main_revision'),
}
