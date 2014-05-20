#!/bin/sh

# cd to the current directory
cd "$(dirname "$0")"

cp -r d3js aww

rm aaw/iframe*

zip -r africawaterweek.zip aww

rm -r aww
