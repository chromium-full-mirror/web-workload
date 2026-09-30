#! /bin/bash

MSG="${1:-Failed to deploy to Firebase.}"
LOG_FILE="$(pwd -P)/firebase-debug.log"
echo "" >&2
if grep -qE "401|UNAUTHENTICATED|Authentication Error" "$LOG_FILE" 2>/dev/null; then
  echo "Error: Firebase authentication failed (credentials expired or invalid)." >&2
  echo "Please re-authenticate with:" >&2
  echo "  firebase login --reauth" >&2
else
  echo "Error: $MSG" >&2
  echo "See $LOG_FILE for details." >&2
fi
exit 1
