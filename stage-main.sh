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

if [ -z "$URL" ]; then
  "$DIR/firebase-error-helper.sh" "Failed to stage to Firebase (no Channel URL found)."
  exit 1
fi

echo "";
echo "RUNNING TESTS ON $URL";
vpython3 ./test-deployment.py $URL;
