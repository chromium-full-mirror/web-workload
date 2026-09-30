#! /bin/bash

DIR=`readlink "$0"` || DIR="$0";
DIR=`dirname "$DIR"`;
cd "$DIR"
DIR=`pwd -P`

read -n 1 -p "Run \`gclients sync --reset --upstream\`? [yN]" ANSWER
if [ "$ANSWER" != "${ANSWER#[Yy]}" ] ;then
    gclient sync --reset --upstream
fi

echo "Deploying " $DIR;
firebase deploy --only hosting:default || "$DIR/firebase-error-helper.sh";
