#!/usr/bin/env bash
deno check --config frontend/deno.json frontend/src
deno check --config backend/deno.json backend/src
deno fmt --config frontend/deno.json frontend/src
deno fmt --config backend/deno.json backend/src
deno fmt --config frontend/deno.json shared/
for f in backend/instances/*.json; do
  if ! jq -e '.' "$f" > /dev/null; then
    echo "$f is invalid"
    exit 1
  fi
done
