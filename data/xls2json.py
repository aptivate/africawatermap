#!/usr/bin/env python
# -*- coding: utf-8 -*-

# script to read in Excel spreadsheet and spit out the json format we
# need

from __future__ import unicode_literals

import json
import sys
import xlrd

NAME_CODE = {
    "Algeria": "DZ",
    "Angola": "AO",
    "Benin": "BJ",
    "Botswana": "BW",
    "Burkina Faso": "BF",
    "Burundi": "BI",
    "Cameroon": "CM",
    "Cape Verde": "CV",
    "Central African Republic": "CF",
    "Chad": "TD",
    "Comoros": "KM",
    "Congo": "CG",
    "Côte d'Ivoire": "CI",
    "Democratic Republic of the Congo": "CD",
    "Djibouti": "DJ",
    "Egypt": "EG",
    "Equatorial Guinea": "GQ",
    "Eritrea": "ER",
    "Ethiopia": "ET",
    "Gabon": "GA",
    "Gambia": "GM",
    "Ghana": "GH",
    "Guinea": "GN",
    "Guinea-Bissau": "GW",
    "Kenya": "KE",
    "Lesotho": "LS",
    "Liberia": "LR",
    "Libyan Arab Jamahiriya": "LY",
    "Madagascar": "MG",
    "Malawi": "MW",
    "Mali": "ML",
    "Mauritania": "MR",
    "Mauritius": "MU",
    "Mayotte": "YT",
    "Morocco": "MA",
    "Mozambique": "MZ",
    "Namibia": "NA",
    "Niger": "NE",
    "Nigeria": "NG",
    "Réunion": "RE",
    "Rwanda": "RW",
    "Sao Tome and Principe": "ST",
    "Senegal": "SN",
    "Seychelles": "SC",
    "Sierra Leone": "SL",
    "Somalia": "SO",
    "South Africa": "ZA",
    "South Sudan": "SS",
    "Sudan": "SD",
    "Swaziland": "SW",
    "Togo": "TG",
    "Tunisia": "TN",
    "Uganda": "UG",
    "United Republic of Tanzania": "TZ",
    "Western Sahara": "EH",
    "Zambia": "ZM",
    "Zimbabwe": "ZW",
}

CODE_NAME = dict([(v, k) for k, v in NAME_CODE.items()])


def get_year_keys(sheet):
    """ extract the years from the first row of the sheet, returns a list
    of years as numbers """
    year_keys = []
    for curr_cell in xrange(2, sheet.ncols):
        try:
            year = int(sheet.cell_value(0, curr_cell))
        except:
            year = None
        year_keys.append(year)
    return year_keys


def row_has_data(sheet, row_num):
    """ returns True if row has data """
    first_value = sheet.cell_value(row_num, 2)
    if not first_value or first_value == 'NODATA':
        return False
    try:
        first_value = float(first_value)
        if first_value > 0:
            return True
    except:
        pass
    return False


def process_sheet(sheet):
    """ returns dictionary, key is country code, value is dictionary of
    year: value, or None if no data """
    sheet_dict = {}
    year_keys = get_year_keys(sheet)
    for curr_row in xrange(1, sheet.nrows):
        country_name = sheet.cell_value(curr_row, 1)
        if country_name in NAME_CODE and NAME_CODE[country_name]:
            country_code = NAME_CODE[country_name]
        else:
            #print "%s not found" % country_name
            continue
        if not row_has_data(sheet, curr_row):
            continue

        sheet_dict[country_code] = {}
        for index, year in enumerate(year_keys):
            value = float(sheet.cell_value(curr_row, index + 2))
            # some values are over 100, don't let that happen
            value = min(value, 100.0)
            sheet_dict[country_code][year] = value
    return sheet_dict


def main(argv):
    if len(argv) < 2:
        xls_filename = 'mapdata.xlsx'
    else:
        xls_filename = argv[1]

    final_dict = {}
    book = xlrd.open_workbook(xls_filename)
    sheet_names = {
        'wat': 'water',
        'san': 'sanitation',
        'univwat': 'universal_water',
        'univsan': 'universal_sanitation',
    }
    for name in sheet_names:
        sheet = book.sheet_by_name(name)
        data = process_sheet(sheet)
        for country_code in data:
            if country_code not in final_dict:
                final_dict[country_code] = {
                    'name': CODE_NAME[country_code]
                }
            final_dict[country_code][sheet_names[name]] = data[country_code]

    print json.dumps(final_dict, indent=4, sort_keys=True)
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv))
