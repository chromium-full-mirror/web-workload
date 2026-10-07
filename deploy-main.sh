#! /bin/bash

DIR=`readlink "$0"` || DIR="$0";
DIR=`dirname "$DIR"`;
cd "$DIR"
DIR=`pwd -P`

"$DIR/sync_and_build.sh" || exit 1

echo "Deploying " $DIR;
firebase deploy --only hosting:default || "$DIR/firebase-error-helper.sh";
