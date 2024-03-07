#! /bin/bash

# a simpler version for single dereferencing
DIR=`readlink "$0"` || DIR="$0";
DIR=`dirname "$DIR"`;
cd "$DIR"
DIR=`pwd -P`

echo "Deploying " $DIR;

firebase target:apply hosting default chromium-workloads;

for ID in `seq 0 9`; do
    firebase target:apply hosting $ID chromium-workloads-$ID;
done

firebase deploy --only hosting:default;
for ID in `seq 0 9`; do
    firebase deploy --only hosting:$ID;
done