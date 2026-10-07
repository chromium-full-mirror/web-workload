#! /bin/bash

DIR=`readlink "$0"` || DIR="$0";
DIR=`dirname "$DIR"`;

read -n 1 -p "Run \`gclient sync --reset --upstream\`? [yN]" ANSWER
echo ""
if [ "$ANSWER" != "${ANSWER#[Yy]}" ] ;then
    gclient sync --reset --upstream || exit 1
fi

vpython3 "$DIR/build.py" || exit 1
