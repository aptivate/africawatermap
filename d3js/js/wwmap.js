var wwMap = (function() {

var config, allData, ie8_or_less,
	countryInfo,
	selectedCountry, selectedYear, selectedSource,
	path, mapsvg, colorScale, mapSlider, tooltipdiv;

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
	selectedCountry = d.id;
	console.log('clicked on ' + d.properties.name + ' (code ' + d.id + ')');
	plotAllYearData();
	// TODO: change border for this country - make thicker, change colour
}

function hoverCountry(d) {
	var coverage = valueForCountry(d.id, selectedYear);
	if (coverage == null) { return; }
	tooltipdiv.transition()
		.duration(200)
		.style("opacity", 0.9);
	tooltipdiv.html(d.properties.name + "<br />" + coverage.toFixed(1) + "%")
		.style("left", (d3.event.pageX) + "px")
		.style("top", (d3.event.pageY - 28) + "px");
}

function unhoverCountry(d) {
	tooltipdiv.transition()
		.duration(500)
		.style("opacity", 0);
}

function updateSliderYear() {
	d3.select("a.d3-slider-handle").text(selectedYear.toString());
}

function updateColorScale() {
	var colorRange;
	if (selectedSource == "water") {
		colorRange = config.waterColorRange;
	} else {
		colorRange = config.sanitationColorRange;
	}
	colorScale = d3.scale.threshold()
		.domain([10, 20, 30, 40, 50, 60, 70, 80, 90, 101])
		.range(colorRange);
}

/* called by the slider */
function setYear(ext, value) {
	selectedYear = value;
	// update everything that varies by year
	updateSliderYear();
	setCountryInfoAccessText();
	updateMapColors();
}

function setSource(source) {
	selectedSource = source;
	// update everything that varies by source
	setCountryInfoAccessText();
	updateMapColors();
}

function getCountryName(country_code) {
	if (allData.hasOwnProperty(country_code)) {
		return allData[country_code]["name"];
	}
	return "unknown"
}

function valueForCountry(country_code, year) {
	if (allData.hasOwnProperty(country_code)) {
		// now get "water" or "sanitation"
		if (allData[country_code].hasOwnProperty(selectedSource + "_initial") &&
		    allData[country_code].hasOwnProperty(selectedSource + "_increase")) {
			var initial = allData[country_code][selectedSource + "_initial"];
			var increase = allData[country_code][selectedSource + "_increase"];
			var numYears = year - config.minYear;
			// don't return a value > 100
			return Math.min(100, initial + (numYears * increase));
		}
	}
	// catch all exit
	return null;
}

/* finds the year when the percent = 100 */
function findYear100(country_code) {
	if (allData.hasOwnProperty(country_code)) {
		// now get "water" or "sanitation"
		if (allData[country_code].hasOwnProperty(selectedSource + "_initial") &&
		    allData[country_code].hasOwnProperty(selectedSource + "_increase")) {
			var initial = allData[country_code][selectedSource + "_initial"];
			var increase = allData[country_code][selectedSource + "_increase"];
			if (increase <= 0) {
				return null;
			}
			return Math.round((100 - initial) / increase) + config.minYear;
		}
	}
	return null;
}

function extractDataForSourceAndYear() {
	// selectedSource should be "water" or "sanitation"
	var yearData = {};
	// cycle through the countries
	for (var country_code in allData) {
		if (allData.hasOwnProperty(country_code)) {
			var value = valueForCountry(country_code, selectedYear);
			if (value != null) {
				yearData[country_code] = value;
			}
		}
	}
	return yearData;
}

/* Expects a {"1990": 43.1, "1991": 43.7, ...}
 * and will return [43.1, 43.7, ...]
 */
function convertAllYearDataToArray(dataset) {
	var yearArray = [];
	for (var year = config.minYear; year <= config.maxYear; year++) {
		if (dataset.hasOwnProperty(year.toString())) {
			yearArray.push(dataset[year.toString()]);
		}
	}
	return yearArray;
}

function addLegend(titleText) {
	options = {
		title: titleText,
		fill: true
	};
	colorlegend("#map-legend", colorScale, "linear", options);
}

function setCountryInfoAccessText() {
	d3.select("#country-info-access-text")
		.text(valueForCountry(selectedCountry, selectedYear).toFixed(1) +
			"% of people have access to " + selectedSource + " in " +
			selectedYear.toString());
}

function plotAllYearData() {
	var margin = 20;
	var y = d3.scale.linear()
		.domain([0, 100])
		.range([0 + margin, countryInfo.height - margin]);
	var x = d3.scale.linear()
		.domain([config.minYear, config.maxYear])
		.range([0 + margin, countryInfo.width - margin]);

	// remove everything inside the country-info div
	d3.select("#country-info").selectAll("*").remove();
	// put title stuff in
	var country_info = d3.select("#country-info");
	country_info.append("h2")
		.text(getCountryName(selectedCountry));
	country_info.append("p")
		.attr("id", "country-info-access-text");
	setCountryInfoAccessText();

	// add the graph
	var vis = country_info.append("svg:svg")
		.attr("id", "country-info-graph")
		.attr("width", countryInfo.width)
		.attr("height", countryInfo.height);

	var g = vis.append("svg:g")
		.attr("transform", "translate(0, " + countryInfo.height.toString() + ")");

	var minYearValue = valueForCountry(selectedCountry, config.minYear);
	var thisYearValue = valueForCountry(selectedCountry, config.thisYear);
	var maxYearValue = valueForCountry(selectedCountry, config.maxYear);

	// the graph lines
	g.append("svg:line")
		.attr("class", "history")
		.attr("x1", x(config.minYear))
		.attr("y1", -1 * y(minYearValue))
		.attr("x2", x(config.thisYear))
		.attr("y2", -1 * y(thisYearValue));

	if (maxYearValue > 99.9) {
		// handle the case where we hit 100% before maxYear
		var year100 = findYear100(selectedCountry);
		g.append("svg:line")
			.attr("class", "projection")
			.attr("x1", x(config.thisYear))
			.attr("y1", -1 * y(thisYearValue))
			.attr("x2", x(year100))
			.attr("y2", -1 * y(100));

		g.append("svg:line")
			.attr("class", "projection")
			.attr("x1", x(year100))
			.attr("y1", -1 * y(100))
			.attr("x2", x(config.maxYear))
			.attr("y2", -1 * y(100));

	} else {
		g.append("svg:line")
			.attr("class", "projection")
			.attr("x1", x(config.thisYear))
			.attr("y1", -1 * y(thisYearValue))
			.attr("x2", x(config.maxYear))
			.attr("y2", -1 * y(maxYearValue));

		// the plotted line to achieve universal access
		// but only plot it if we won't reach it anyway
		g.append("svg:line")
			.attr("class", "universal")
			.attr("x1", x(config.thisYear))
			.attr("y1", -1 * y(thisYearValue))
			.attr("x2", x(config.maxYear))
			.attr("y2", -1 * y(100));
	}
	// the axes
	g.append("svg:line")
		.attr("class", "axis")
		.attr("x1", x(config.minYear))
		.attr("y1", -1 * y(0))
		.attr("x2", x(config.maxYear))
		.attr("y2", -1 * y(0));
	g.append("svg:line")
		.attr("class", "axis")
		.attr("x1", x(config.minYear))
		.attr("y1", -1 * y(0))
		.attr("x2", x(config.minYear))
		.attr("y2", -1 * y(100));

	// the ticks on the axes
	g.selectAll(".xLabel")
		.data(config.yearsOnGraph)
		.enter().append("svg:text")
		.attr("class", "xLabel")
		.text(String)
		.attr("x", function(d) { return x(d); })
		.attr("y", 0)
		.attr("text-anchor", "middle");
	g.selectAll(".yLabel")
		.data(y.ticks(3))
		.enter().append("svg:text")
		.attr("class", "yLabel")
		.text(String)
		.attr("x", 0)
		.attr("y", function(d) { return -1 * y(d); })
		.attr("text-anchor", "right")
		.attr("dy", 4);

	g.selectAll(".xTicks")
		.data(config.yearsOnGraph)
		.enter().append("svg:line")
		.attr("class", "xTicks")
		.attr("x1", function(d) { return x(d); })
		.attr("y1", -1 * y(0))
		.attr("x2", function(d) { return x(d); })
		.attr("y2", -1 * y(-5));
	g.selectAll(".yTicks")
		.data(y.ticks(3))
		.enter().append("svg:line")
		.attr("class", "yTicks")
		.attr("x1", -1 * x(config.minYear))
		.attr("y1", function(d) { return -1 * y(d); })
		.attr("x2", -1 * x(config.minYear-3))
		.attr("y2", function(d) { return -1 * y(d); });
}

function colorScaleOrDefault(data, id) {
	if (data.hasOwnProperty(id)) {
		return colorScale(data[id]);
	} else {
		return config.noDataColor;
	}
}

function updateMapColors() {
	var yearData = extractDataForSourceAndYear();
	mapsvg.selectAll(".country")
		.style("fill", function(d) {
			return colorScaleOrDefault(yearData, d.id);
		})
}

function loadedDataCallback(error, africa, dataset) {
	allData = dataset;
	var countries = topojson.feature(africa, africa.objects.subunits).features;
	var borders = topojson.mesh(africa, africa.objects.subunits,
		function(a, b) { return true; });

	updateColorScale();

	mapsvg.selectAll(".subunit")
		.data(countries)
		.enter()
			.append("path")
			.attr("d", path)
			.attr("class", function(d) { return "country " + d.id; })
			.on("click", countryClicked)
			.on("mouseover", hoverCountry)
			.on("mouseout", unhoverCountry);

	updateMapColors();

	mapsvg.append("path")
		.datum(borders)
		.attr("d", path)
		.attr("class", "country-border");

	addLegend('Water stuff');

	// TODO: make this graph for all of Africa
	plotAllYearData();
}

function init(mapconfig) {
	config = mapconfig;

	ie8_or_less = is_ie8_or_less();
	selectedCountry = "ZA";
	selectedSource = "water";
	selectedYear = config.thisYear;

	var width = parseInt(d3.select('#map').style('width'));
	var mapRatio = 1.0;
	var height = width * mapRatio;

	countryInfo = {height: 140, width: 240};

	//var width = 960, height = 1160;

	var projection = d3.geo.mercator()
		.scale(width/1.25)
		.translate([width/4, height/2+10]);
	path = d3.geo.path().projection(projection);

	d3.select("#select-water-source")
		.on("click", function(d) { setSource("water"); });
	d3.select("#select-sanitation-source")
		.on("click", function(d) { setSource("sanitation"); });

	mapsvg = d3.select("#map").append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("class", "map-svg");
	tooltipdiv = d3.select("#map").append("div")
		.attr("class", "tooltip")
		.style("opacity", 0);

	queue()
		.defer(d3.json, config.mapurl_topojson)
		.defer(d3.json, config.dataurl)
		.await(loadedDataCallback);

	mapSlider = d3.select('#year-slider').call(
		d3.slider()
			.axis(true)
			.min(config.minYear)
			.max(config.maxYear)
			.step(1)
			.value(selectedYear)
			.on("slide", setYear));
	updateSliderYear();
}

return {init: init};

})();
