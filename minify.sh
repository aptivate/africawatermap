#!/bin/sh

# cd to the current directory
cd "$(dirname "$0")"

# minify js
cat d3js/js/wwmap.js | uglifyjs > d3js/js/wwmap.min.js

# minify mson
jq --compact-output --ascii-output . d3js/data/lang_en.json > d3js/data/lang_en.min.json
jq --compact-output --ascii-output . d3js/data/lang_fr.json > d3js/data/lang_fr.min.json

# minify CSS
minify d3js/css/wwmap.css
