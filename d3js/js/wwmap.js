var path, mapsvg, colorScale, wwmap_config, mapSlider, selectedCountry,
	allData, ie8_or_less, tooltipdiv, selectedYear;

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
	// TODO: change border for this country - make thicker, change colour
}

function hoverCountry(d) {
	var coverage = valueForCountry(d.id);
	console.log('hover over ' + d.properties.name + ' (value ' + coverage + ')');
	tooltipdiv.transition()
		.duration(200)
		.style("opacity", 0.9);
	tooltipdiv.html(d.properties.name + "<br />" + coverage.toString() + "%")
		.style("left", (d3.event.pageX) + "px")
		.style("top", (d3.event.pageY - 28) + "px");
}

function unhoverCountry(d) {
	tooltipdiv.transition()
		.duration(500)
		.style("opacity", 0);
}

function getYear() {
	// TODO: get the year from the slider
	return selectedYear;
}

function getSource() {
	// TODO: get the year from the slider
	return "water";
}

function valueForCountry(country_code) {
	datasource = getSource();
	year = getYear().toString();
	if (allData.hasOwnProperty(country_code)) {
		// now get "water" or "sanitation"
		if (allData[country_code].hasOwnProperty(datasource)) {
			if (allData[country_code][datasource].hasOwnProperty(year)) {
				return allData[country_code][datasource][year];
			}
		}
	}
	// catch all exit
	return null;
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
		countries = africa.features;
		// TODO: do geojson version of borders
		borders = null;
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
		.range(wwmap_config.waterColorRange);
	function colorScaleOrDefault(data, id) {
		if (data.hasOwnProperty(id)) {
			return colorScale(data[id]);
		} else {
			return wwmap_config.noDataColor;
		}
	}

	mapsvg.selectAll(".subunit")
		.data(countries)
		.enter()
			.append("path")
			.attr("class", function(d) { return "country " + d.id; })
			.style("fill", function(d) {
				return colorScaleOrDefault(yearData, d.id);
			})
			.attr("d", path)
			.on("click", countryClicked)
			.on("mouseover", hoverCountry)
			.on("mouseout", unhoverCountry);

	if (borders != null) {
	mapsvg.append("path")
		.datum(borders)
		.attr("d", path)
		.attr("class", "country-border");
	}

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
	selectedYear = 2014;

	var width = parseInt(d3.select('#map').style('width'));
	var mapRatio = 1.0;
	var height = width * mapRatio;
	if (ie8_or_less) { height = 500; width = 500;}

	//var width = 960, height = 1160;

	var projection = d3.geo.mercator()
		.scale(width/1.25)
		.translate([width/4, height/2+10]);
	path = d3.geo.path().projection(projection);

	mapsvg = d3.select("#map").append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("class", "map-svg");
	tooltipdiv = d3.select("#map").append("div")
		.attr("class", "tooltip")
		.style("opacity", 0);

	mapurl = ie8_or_less ? config.mapurl_geojson : config.mapurl_topojson;
	queue()
		.defer(d3.json, mapurl)
		.defer(d3.json, config.dataurl)
		.await(wwmapLoadedDataCallback);

	if (!ie8_or_less) {
	mapSlider = d3.select('#year-slider').call(
		d3.slider().axis(true).min(config.minYear).max(config.maxYear));
	}
}
