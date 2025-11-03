#! /bin/bash

DIR=`readlink "$0"` || DIR="$0";
DIR=`dirname "$DIR"`;
cd "$DIR"
DIR=`pwd -P`

echo "Staging " $DIR;
{
  RAW_URL_LINE=$(\
    firebase hosting:channel:deploy --only default --expires 6h stage | \
      tee >(grep "Channel URL") \
    >&3);
} 3>&1;

URL=$(echo $RAW_URL_LINE | grep -oE 'https://[^ ]+');

echo "";
echo "RUNNING TESTS ON $URL";
vpython3 ./test-deployment.py $URL;
