#!/usr/bin/env bash
set -x

if ! command -v firebase 2>&1 >/dev/null
then
  echo "INSTALLING FIREBASE CLI";
  npm install -g firebase-tools
fi

echo "FIREBASE AUTHENTICATE";
firebase login
