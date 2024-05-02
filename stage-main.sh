#! /bin/bash

DIR=`readlink "$0"` || DIR="$0";
DIR=`dirname "$DIR"`;
cd "$DIR"
DIR=`pwd -P`

echo "Staging " $DIR;
firebase hosting:channel:deploy --only default --expires 6h stage;
