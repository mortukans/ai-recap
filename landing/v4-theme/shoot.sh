#!/bin/sh
# usage: shoot.sh name width height "index query (no ?)"   — renders index.html inside an iframe of exactly width x height
D="$(cd "$(dirname "$0")" && pwd -W 2>/dev/null || pwd)"
Q=$(printf '%s' "$4" | sed 's/&/%26/g; s/=/%3D/g')
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --window-size=$2,$3 --virtual-time-budget=6000 --screenshot="$D/_shots/$1.png" "file:///$D/_shots/frame.html?w=$2&h=$3&q=$Q" >/dev/null 2>&1
echo "$1 done"
