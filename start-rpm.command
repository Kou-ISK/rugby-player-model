#!/bin/zsh
set -eu
rpm_source="${0:A:h}"
rpm_node="$HOME/Library/Application Support/RugbyPlayerModel/runtime/bin/node"
if [[ ! -x "$rpm_node" ]]; then
  print -u2 '専用Node 24が見つかりません。docs/MAC_START.md の起動設定を確認してください。'
  exit 1
fi
exec nice -n 10 "$rpm_node" "$rpm_source/scripts/local-launcher.mjs" start "$@"
