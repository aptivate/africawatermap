var path, svg, colorScale, wwmap_config, mapSlider, selectedCountry,
	allData, ie8_or_less;

function is_ie8_or_less() {
	// return true if internet explorer, and version is 8 or less
	var myNav = navigator.userAgent.toLowerCase();
	if (myNav.indexOf('msie') != -1) {
		var version = parseInt(myNav.split('msie')[1]);
		if (version <= 8) {
			return true;
		}
	}
	return false;
}

function pluck(anObject, key) {
	range = []
	for (var key in anObject) {
		if (anObject.hasOwnProperty(key)) {
			var obj = anObject[key]
			for (var prop in obj) {
				if (obj.hasOwnProperty(prop)) {
					range.push(obj[prop]);
				}
			}
		}
	}
	return range;
}

function countryClicked(d) {
	selectedCountry = d;
	console.log('clicked on ' + d.properties.name + ' (code ' + d.id + ')');
	// TODO: make this show the line map
}

function getYear() {
	// TODO: get the year from the slider
	return 2014;
}

function extractDataForSourceAndYear(dataset, datasource, year) {
	// datasource should be "water" or "sanitation"
	var yearData = {};
	// cycle through the countries
	for (var country_code in dataset) {
		if (dataset.hasOwnProperty(country_code)) {
			var country_data = dataset[country_code];
			// now get "water" or "sanitation"
			if (country_data.hasOwnProperty(datasource)) {
				var datadict = country_data[datasource];
				// now get the value for this year
				if (datadict.hasOwnProperty(year.toString())) {
					yearData[country_code] = datadict[year.toString()];
				}
			}
		}
	}
	return yearData;
}

function extractAllYearDataForCountryAndSource(dataset, country_code, datasource) {
	var allYearData = {};
	// cycle through the countries
	if (dataset.hasOwnProperty(country_code)) {
		var country_data = dataset[country_code];
		// now get "water" or "sanitation"
		if (country_data.hasOwnProperty(datasource)) {
			allYearData = country_data[datasource];
		}
	}
	return allYearData;
}

function wwmapLoadedDataCallback(error, africa, dataset) {
	allData = dataset;
	var countries, borders;
	if (ie8_or_less) {
		// TODO: do geojson version
	} else {
		 countries = topojson.feature(africa, africa.objects.subunits).features;
		 borders = topojson.mesh(africa, africa.objects.subunits,
			function(a, b) { return true; });
	}

	var yearData = extractDataForSourceAndYear(dataset, "water", getYear());

	//dataRange = d3.extent(pluck(yearData, 'water'));
	colorScale = d3.scale.linear()
		.domain([0, 100])  //.domain(dataRange)
		.interpolate(d3.interpolateRgb)
		.range([wwmap_config.waterMinColor, wwmap_config.waterMaxColor]);
	function colorScaleOrDefault(data, id) {
		if (data.hasOwnProperty(id)) {
			return colorScale(data[id]);
		} else {
			return wwmap_config.noDataColor;
		}
	}

	svg.selectAll(".subunit")
		.data(countries)
		.enter()
			.append("path")
			.attr("class", function(d) { return "country " + d.id; })
			.style("fill", function(d) {
				return colorScaleOrDefault(yearData, d.id);
			})
			.attr("d", path)
			.on("click", countryClicked);

	svg.append("path")
		.datum(borders)
		.attr("d", path)
		.attr("class", "country-border");

	addLegend('Water stuff');
}

function addLegend(titleText) {
	options = {
		title: titleText,
		fill: true
	};
	colorlegend("#map-legend", colorScale, "linear", options);
}

function wwmap_init(config) {
	wwmap_config = config;

	ie8_or_less = is_ie8_or_less();
	var margin = {top: 20, left: 20, bottom: 20, right: 20};
	var width = parseInt(d3.select('#map').style('width'));
	width = (width - margin.left - margin.right) * 0.7;
	var mapRatio = 1.0;
	var height = width * mapRatio;

	//var width = 960, height = 1160;

	var projection = d3.geo.mercator().scale(width/2).translate([width/2, height/2]);
	path = d3.geo.path().projection(projection);

	svg = d3.select("#map").append("svg").attr("width", width).attr("height", height);

	mapurl = ie8_or_less ? config.mapurl_geojson : config.mapurl_topojson;
	queue()
		.defer(d3.json, mapurl)
		.defer(d3.json, config.dataurl)
		.await(wwmapLoadedDataCallback);

	mapSlider = d3.select('#year-slider').call(
		d3.slider().axis(true).min(config.minYear).max(config.maxYear));
}
