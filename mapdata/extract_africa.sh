#!/bin/sh

# extract just African countries into subunits.json
ogr2ogr \
    -f GeoJSON \
    -where "continent IN ('Africa')" \
    subunits.json \
    ne_110m_admin_0_countries.shp

# convert to topojson (saves lots of space) and drop lots of properties
topojson \
    --id-property 'iso_a2' \
    -p name=NAME \
    -p name \
    -o africa.json \
    subunits.json

# make a readable version of the json
cat africa.json | python -mjson.tool > africa.pp.json

exit 0


    # -where "continent IN ('Africa')" \
    # -where "ISO_A2 IN ('DZ', 'EG', 'EH', 'LY', 'MA', 'SD', 'SS', 'TN')" \
    # -where "ADM0_A3 IN ('ZAF', 'MWI', 'DZA', 'EGY', 'TGO', 'SEN')" \

    #'DZ', 'EG', 'EH', 'LY', 'MA', 'SD', 'SS', 'TN',
    #'BF', 'BJ', 'CI', 'CV', 'GH', 'GM', 'GN', 'GW', 'LR', 'ML', 'MR', 'NE', 'NG', 'SH', 'SL', 'SN', 'TG',
    #'AO', 'CD', 'ZR', 'CF', 'CG', 'CM', 'GA', 'GQ', 'ST', 'TD',
    #'BI', 'DJ', 'ER', 'ET', 'KE', 'KM', 'MG', 'MU', 'MW', 'MZ', 'RE', 'RW', 'SC', 'SO', 'TZ', 'UG', 'YT', 'ZM', 'ZW',
    #'BW', 'LS', 'NA', 'SZ', 'ZA',

# names from inaspsite, country_pages/geochart_data.py
    # Northern Africa
    #'015': set(['DZ', 'EG', 'EH', 'LY', 'MA', 'SD', 'SS', 'TN']),
    # Western Africa
    #'011': set(['BF', 'BJ', 'CI', 'CV', 'GH', 'GM', 'GN', 'GW', 'LR', 'ML', 'MR', 'NE', 'NG', 'SH', 'SL', 'SN', 'TG']),
    # Middle Africa
    #'017': set(['AO', 'CD', 'ZR', 'CF', 'CG', 'CM', 'GA', 'GQ', 'ST', 'TD']),
    # Eastern Africa
    #'014': set(['BI', 'DJ', 'ER', 'ET', 'KE', 'KM', 'MG', 'MU', 'MW', 'MZ', 'RE', 'RW', 'SC', 'SO', 'TZ', 'UG', 'YT', 'ZM', 'ZW']),
    # Southern Africa
    #'018': set(['BW', 'LS', 'NA', 'SZ', 'ZA']),
