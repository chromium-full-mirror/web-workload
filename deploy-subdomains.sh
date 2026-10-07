#! /bin/bash

# a simpler version for single dereferencing
DIR=`readlink "$0"` || DIR="$0";
DIR=`dirname "$DIR"`;
cd "$DIR"
DIR=`pwd -P`

"$DIR/sync_and_build.sh" || exit 1

echo "Deploying " $DIR;

# Only needed for initial setup stored in .firebaserc
# for ID in `seq 0 34`; do
#     firebase target:apply hosting $ID chromium-workloads-$ID;
# done

for ID in `seq 0 34`; do
    firebase deploy --only hosting:$ID || "$DIR/firebase-error-helper.sh" || exit 1;
done