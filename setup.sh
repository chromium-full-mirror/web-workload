#!/usr/bin/env bash
set -x

if ! command -v firebase 2>&1 >/dev/null
then
  echo "PLEASE INSTALL THE FIREBASE CLI";
  echo "https://firebase.google.com/docs/cli#install_the_firebase_cli"
  exit 1
fi

echo "FIREBASE AUTHENTICATE";
firebase login
