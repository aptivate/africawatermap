var wwMap = (function() {

var config, allData, mapData, ie8_or_less,
	lineGraphConfig, sidebarWidth, mapInfoWidth,
	selectedCountry, selectedYear, selectedSource,
	path, mapsvg, colorScale, mapSlider, tooltipdiv,
	colorDomain, extColorDomain;

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

function numberWithCommas(number) {
	// split on decimal point - we discard after decimal
	var parts = number.toString().split(".");
	return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function addLinksToShareButtons() {
	// work out iframe parent link - from http://stackoverflow.com/a/7739035/3189
	var pageUrl = (window.location != window.parent.location) ? document.referrer: document.location;
	var encodedUrl = encodeURIComponent(pageUrl);
	d3.select(".ss-share-link.ico-facebook")
		.attr("href", "http://www.facebook.com/sharer.php?u=" + encodedUrl);
	d3.select(".ss-share-link.ico-twitter")
		.attr("href", "http://twitter.com/share?url=" + encodedUrl +
			"&hashtags=" + config.twitterHashTag);
	d3.select(".ss-share-link.ico-google")
		.attr("href", "http://plus.google.com/share?url=" + encodedUrl);
	d3.select(".ss-share-link.ico-linkedin")
		.attr("href", "http://www.linkedin.com/shareArticle?mini=true&url=" + encodedUrl);
}

/* draw circle and 2 rectangles
 *
 * svg - svg object to draw person on
 * x, y - position of top left corner of person
 * height - in pixels of person.  width with padding will be half
 * class to apply to person (for CSS color styling)
 */
function drawPerson(svg, x, y, height, personClass) {
	var css_class;
	if (personClass) {
		css_class = "person " + personClass;
	} else {
		css_class = "person";
	}
	svg.append("circle")
		.attr("cx", x + 0.2*height)
		.attr("cy", y + 0.15*height)
		.attr("r", 0.15*height)
		.attr("class", css_class);

	svg.append("rect")
		.attr("x", x)
		.attr("y", y + 0.25*height)
		.attr("width", 0.4*height)
		.attr("height", 0.45*height)
		.attr("class", css_class);

	svg.append("rect")
		.attr("x", x + 0.1*height)
		.attr("y", y + 0.7*height)
		.attr("width", 0.2*height)
		.attr("height", 0.3*height)
		.attr("class", css_class);
}

function drawPeopleRow(numPeople, svg, x, y, height, personClass) {
	for (var i = 0; i < numPeople; i++) {
		drawPerson(svg, x + i*height/2, y, height, personClass);
	}
}

function drawPeopleInDiv(totalPeople, maxPeople, divSelector, personClass,
		width, height, personHeight, rightAlign) {
	// TODO: left align the people?
	// remove everything inside the div
	d3.select(divSelector).selectAll("*").remove();

	var personDiv = d3.select(divSelector);

	// add the graph
	var vis = personDiv.append("svg:svg")
		.attr("id", "country-targets-vis")
		.attr("width", width)
		.attr("height", height);

	// TODO: show half people?
	totalPeople = Math.round(totalPeople);
	maxPeople = Math.round(maxPeople);

	// if totalPeople < 5 and maxPeople < 5, draw one row, full height
	// if totalPeople < 5 and maxPeople > 5, draw one row, half height
	// 5-10 we draw 1 rows, half height
	// 10-20 we draw 2 rows, half height
	// over 20 is an error
	var x = 0, y = 0;
	if (rightAlign) {
		// note maxPeople in first if, and totalPeople in 2nd if is deliberate
		// maxPeople controls person size, totalPeople controls number of rows
		if (totalPeople <= 10) {
			x = (10 - totalPeople) * (personHeight/2);
		} else {
			x = (20 - totalPeople) * (personHeight/2);
		}
	}

	if (totalPeople <= 10 ) {
		drawPeopleRow(totalPeople, vis, x, y, personHeight, personClass);
	} else if (totalPeople <= 20 ) {
		// for the 10 person row, x is always 0
		drawPeopleRow(10, vis, 0, y, personHeight, personClass);
		y = personHeight * 1.2;
		drawPeopleRow(totalPeople-10, vis, x, y, personHeight, personClass);
	} else {
		console.log("Can't draw more than 20 people");
	}
}

/* totalPeople is people to draw on this side
 * maxPeople is max people to draw on either side - we use it to set person
 * size so that both sides use the same size people
 */
function drawPeople(totalPeople, maxPeople, current_or_target) {
	var divSelector, personClass;
	if (current_or_target == "current") {
		divSelector = ".currently > .targets-people";
		personClass = "current";
		rightAlign = true;
	} else {
		divSelector = ".for-target > .targets-people";
		personClass = "target";
		rightAlign = false;
	}
	// TODO: deal with negative numbers - actually there are no negative
	// numbers in the dataset, though %age can be negative

	areaWidth = config.personFullHeight * 5.2;
	areaHeight = config.personFullHeight * 2.4;

	drawPeopleInDiv(totalPeople, maxPeople, divSelector, personClass,
		areaWidth, areaHeight, config.personFullHeight, rightAlign);
}

function updatePersonKey(peopleUnits) {
	personHeight = config.personFullHeight;
	drawPeopleInDiv(1, 1, "#targets-key-person", "key",
		personHeight, personHeight, personHeight, false);

	var key_text = " = " + numberWithCommas(peopleUnits) + " people";
	d3.select("#targets-key-text").text(key_text);
}

function isDataForCountry(country_code) {
	if (allData.hasOwnProperty(country_code)) {
		if (allData[country_code].hasOwnProperty(selectedSource + "_initial") &&
		    allData[country_code].hasOwnProperty(selectedSource + "_increase")) {
			return true;
		}
	}
	return false;
}

function isTargetDataForCountry(country_code) {
	if (allData.hasOwnProperty(country_code)) {
		if (allData[country_code].hasOwnProperty(selectedSource + "_pop_current") &&
		    allData[country_code].hasOwnProperty(selectedSource + "_pop_universal")) {
			return true;
		}
	}
	return false;
}

function extraPercentToHitTarget(country_code) {
	if (isDataForCountry(country_code)) {
		var maxYearValue = valueForCountry(selectedCountry, config.maxYear);
		if (maxYearValue > 99.9) {
			return -1;
		}
		return (100 - maxYearValue) / (config.maxYear - config.thisYear);
	}
	return -1;
}

/* should we use k or m (thousands or millions)?
 * if both are under 1000000, use k
 * if both are over 1000000, use m
 * if max is over 1000000 and min is over 100000, use m
 * otherwise use k
 *
 * although if one is zero, just use the other number
 */
function selectTextUnits(number1, number2) {
	maxNumber = Math.max(Math.abs(number1), Math.abs(number2));
	minNumber = Math.min(Math.abs(number1), Math.abs(number2));

	if (minNumber == 0) {
		if (maxNumber < 1000000) {
			return "k";
		} else {
			return "m";
		}

	} else {
		if (maxNumber < 1000000) {
			return "k";
		} else if (minNumber >= 100000) {
			return "m";
		} else {
			return "k";
		}
	}
}

/* converts number to numbers + m/k for million/thousand */
function numberAndUnitsToDigits(number, units) {
	if (units == "m") {
		number = number / 1000000;
	} else {
		number = number / 1000;
	}

	if (number < 10) {
		return number.toFixed(1);
	} else {
		return Math.round(number);
	}
}

function selectPeopleUnits(number1, number2) {
	maxNumber = Math.max(Math.abs(number1), Math.abs(number2));
	if (maxNumber < 20000) { return 1000; }
	else if (maxNumber < 200000) { return 10000; }
	else if (maxNumber < 2000000) { return 100000; }
	else if (maxNumber < 20000000) { return 1000000; }
	else { return 10000000; }
}

function removeSelectedBorder() {
	// remove any old selected border
	d3.select(".selected-country-border").remove();
}

function updateSelectedBorder() {
	// remove any old selected border
	d3.select(".selected-country-border")
		.attr("class", "selected-country-border " + selectedSource);
}

function addBorderToSelectedCountry() {
	removeSelectedBorder();

	// add a border to just this country
	var selectedBorder = topojson.mesh(mapData, mapData.objects.subunits,
		function(a, b) { return (a.id == selectedCountry || b.id == selectedCountry); });
	mapsvg.append("path")
		.datum(selectedBorder)
		.attr("d", path)
		.attr("class", "selected-country-border " + selectedSource);
}

function countryClicked(d) {
	// don't select countries we don't have data for
	if (isDataForCountry(d.id)) {
		selectedCountry = d.id;
		updateSideBar();
		addBorderToSelectedCountry();
	}
}

function hoverCountry(d) {
	var coverage = valueForCountry(d.id, selectedYear);
	if (coverage == null) { return; }
	var countryName = d.properties.name;
	// set the width according to the length of the country name, but don't
	// get too small
	var ttWidth = Math.max(65, countryName.length*10);
	d3.select(".tooltip-year").text(selectedYear.toString());
	d3.select(".tooltip-country").text(countryName);
	d3.select(".tooltip-percent").text(coverage.toFixed(1) + "%");
	tooltipdiv.transition()
		.duration(200)
		.style("opacity", 0.9);
	tooltipdiv
		.style("width", ttWidth + "px")
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

function setCountryInfoYear() {
	d3.select(".country-info-year").text(selectedYear.toString());
}

function updateColorScale() {
	var colorRange;
	if (selectedSource == "water") {
		colorRange = config.waterColorRange;
	} else {
		colorRange = config.sanitationColorRange;
	}
	colorScale = d3.scale.threshold()
		.domain(colorDomain)
		.range(colorRange);
}

/* called by the slider */
function setYear(ext, value) {
	selectedYear = value;
	// update everything that varies by year
	updateSliderYear();
	setCountryInfoYear();
	setCountryInfoAccessText();
	updateMapColors();
}

function setSource(source) {
	selectedSource = source;
	// update everything that varies by source
	setCountryInfoAccessText();
	updateColorScale();
	updateLegend();
	updateMapColors();
	updateSideBar();
	updateSelectedBorder();
}

function getCountryName(country_code) {
	if (allData.hasOwnProperty(country_code)) {
		return allData[country_code]["name"];
	}
	return "unknown"
}

function valueForCountry(country_code, year) {
	if (isDataForCountry(country_code)) {
		var initial = allData[country_code][selectedSource + "_initial"];
		var increase = allData[country_code][selectedSource + "_increase"];
		var numYears = year - config.minYear;
		// don't return a value > 100
		return Math.min(100, initial + (numYears * increase));
	}
	// catch all exit
	return null;
}

/* finds the year when the percent = 100 */
function findYear100(country_code) {
	if (isDataForCountry(country_code)) {
		var initial = allData[country_code][selectedSource + "_initial"];
		var increase = allData[country_code][selectedSource + "_increase"];
		if (increase <= 0) {
			return null;
		}
		return Math.round((100 - initial) / increase) + config.minYear;
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

function updateLegend() {
	// remove the old legend, if any
	var legendDiv = d3.select("#map-legend-svg");
	legendDiv.selectAll("*").remove();

	var lenScale = extColorDomain.length;
	// subtract lenScale for 1 px separator between boxes
	// subtract 20 to allow for 10px margin either side
	// divide by lenScale for size of each
	var legendWidth = parseInt(legendDiv.style('width'));
	var ls_w = Math.floor((legendWidth - lenScale) / lenScale);
	var ls_h = ls_w;
	var legend_width = (ls_w + 1) * (lenScale + 1);

	// create the new legend
	var legendSvg = legendDiv.append("svg")
		.attr("width", legend_width)
		.attr("height", ls_h)
		.style("margin", "auto");
	
	var legend = legendSvg.selectAll("g.legend")
		.data(extColorDomain)
		.enter().append("g")
		.attr("class", "legend");
	
	legend.append("rect")
		.attr("x", function(d, i) { return (ls_w + 1) * i; })
		.attr("y", 0)
		.attr("width", ls_w)
		.attr("height", ls_h)
		.style("fill", function(d, i) { return colorScale(d); })
		.style("opacity", 0.8);

	if (selectedSource == 'water') {
		title = "access to water";
	} else {
		title = "access to sanitation";
	}
	d3.select("#map-legend-label")
		.text(title)
		.style("width", legend_width);
}

function setCountryInfoAccessText() {
	percentValue = valueForCountry(selectedCountry, selectedYear).toFixed(1);
	if (selectedSource == 'water') {
		accessText = ' of people have access to water ';
	} else {
		accessText = ' of people have access to sanitation ';
	}
	accessTextElement = d3.select("#country-info-access-text");
	accessTextElement.selectAll("*").remove();
	percentSpan = accessTextElement.append("span")
		.attr("class", "access-percentage")
		.text(percentValue);
	percentSpan.append("span")
		.attr("class", "percent-sign")
		.text("%");
	accessTextElement.append("span").text(accessText);
	accessTextElement.append("span")
		.attr("class", "in-year")
		.text("in " + selectedYear.toString());
	accessTextElement.append("span")
		.attr("class", "actual-projected")
		.text(" (actual and projected)");
}

function plotAllYearData() {
	var margin = 20;
	var y = d3.scale.linear()
		.domain([0, 100])
		.range([0 + margin, lineGraphConfig.height - margin]);
	var x = d3.scale.linear()
		.domain([config.minYear, config.maxYear])
		.range([0 + margin, lineGraphConfig.width - margin]);

	var country_info = d3.select("#country-info");
	// remove everything inside the country-info div
	country_info.selectAll("*").remove();
	// put title stuff in
	country_info.append("div")
		.attr("class", "country-info-year")
		.text(selectedYear.toString());
	country_info.append("h2")
		.text(getCountryName(selectedCountry));
	country_info.append("p")
		.attr("id", "country-info-access-text");
	setCountryInfoAccessText();

	// add the graph
	var vis = country_info.append("svg:svg")
		.attr("id", "country-info-graph")
		.attr("width", lineGraphConfig.width)
		.attr("height", lineGraphConfig.height);

	var g = vis.append("svg:g")
		.attr("transform", "translate(0, " + lineGraphConfig.height.toString() + ")");

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

/* update the targets
 *
 * We need to update both the numbers, units (k/m) and the set of people
 * representing the numbers
 */
function updateTargetPanel() {
	if (isTargetDataForCountry(selectedCountry)) {
		var popCurrent = 1000 * allData[selectedCountry][selectedSource + "_pop_current"];
		var popUniversal = 1000 * allData[selectedCountry][selectedSource + "_pop_universal"] - popCurrent;
		// popUniversal is relative, but don't allow popUniversal to be negative
		if (popUniversal < 10) { popUniversal = 0; }

		var units = selectTextUnits(popCurrent, popUniversal);
		var digitsCurrent = numberAndUnitsToDigits(popCurrent, units);
		var digitsUniversal = numberAndUnitsToDigits(popUniversal, units);

		d3.select(".currently .targets-number-digits").text(digitsCurrent);
		d3.select(".currently .targets-number-unit").text(units);

		if (popUniversal > 0) {
			d3.select(".for-target .targets-number-digits").text(digitsUniversal);
			d3.select(".for-target .targets-number-unit").text(units);
		} else {
			d3.select(".for-target .targets-number-digits").text("0");
			d3.select(".for-target .targets-number-unit").text("");
		}

		// now do the extra percent bit
		var extraPercent = extraPercentToHitTarget(selectedCountry);
		if (extraPercent > 0) {
			d3.select(".targets-percent").style("visibility", "visible");
			d3.select(".targets-percent-digits").text(extraPercent.toFixed(1));
		} else {
			d3.select(".targets-percent").style("visibility", "hidden");
		}

		// now do the people
		var peopleUnits = selectPeopleUnits(popCurrent, popUniversal);
		var numPeopleCurrent = popCurrent/peopleUnits;
		var numPeopleUniversal = popUniversal/peopleUnits;
		var maxPeople = Math.max(numPeopleCurrent, numPeopleUniversal);
		drawPeople(numPeopleCurrent, maxPeople, "current");
		drawPeople(numPeopleUniversal, maxPeople, "target");
		updatePersonKey(peopleUnits);
		d3.select(".targets-key").style("visibility", "visible");

		// finally update the text
		if (selectedSource == "water") {
			d3.select(".targets-subtitle")
				.text("Total number of new people gaining access to water");
			d3.select(".currently > .targets-detail")
				.text("more people per year will gain access to water");
		} else {
			d3.select(".targets-subtitle")
				.text("Total number of new people gaining access to sanitation");
			d3.select(".currently > .targets-detail")
				.text("more people per year will gain access to sanitation");
		}
	} else {
		// no data, so clear the panel
		d3.select(".currently .targets-number-digits").text("");
		d3.select(".currently .targets-number-unit").text("no data");
		d3.select(".for-target .targets-number-digits").text("");
		d3.select(".for-target .targets-number-unit").text("no data");
		d3.select(".targets-percent").style("visibility", "hidden");
		drawPeople(0, 0, "current");
		drawPeople(0, 0, "target");
		d3.select(".targets-key").style("visibility", "hidden");
	}
}

function updateSideBar() {
	plotAllYearData();
	updateTargetPanel();
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

function createSlider() {
	d3.select('#year-slider').selectAll("*").remove();
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

function loadedDataCallback(error, africa, dataset) {
	allData = dataset;
	mapData = africa;
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

	updateLegend();

	updateSideBar();
}

function setDefaultSelections() {
	selectedCountry = config.initialCountry;
	selectedSource = config.initialSource;
	selectedYear = config.thisYear;
}

function init(mapconfig) {
	config = mapconfig;

	// check for svg support
	if (!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1")) {
		// TODO: do fallback thing with image
		// delete the main html
		// replace with img tag with screenshot of data vis, and some text
		// might need to dynamically load jquip to do this with old browsers
		return;
	}
	ie8_or_less = is_ie8_or_less();
	setDefaultSelections();

	var width = parseInt(d3.select('#map').style('width'));
	var mapRatio = 1.0;
	var height = width * mapRatio;
	mapInfoWidth = parseInt(d3.select('section.map-info').style('width'));
	sidebarWidth = parseInt(d3.select('aside.info').style('width'));
	// dimensions of line graph
	lineGraphConfig = {height: config.lineGraphHeight, width: sidebarWidth};

	colorDomain = [10, 20, 30, 40, 50, 60, 70, 80, 90, 101];
	extColorDomain = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

	var projection = d3.geo.mercator()
		.scale(width/1.25)
		.translate([width/4, height/2+10]);
	path = d3.geo.path().projection(projection);

	d3.select("#select-water-source")
		.on("click", function(d) { setSource("water"); });
	d3.select("#select-sanitation-source")
		.on("click", function(d) { setSource("sanitation"); });
	d3.select("#reset-button").on("click", reset);

	mapsvg = d3.select("#map").insert("svg", "div.tooltip")
		.attr("width", width)
		.attr("height", height)
		.attr("class", "map-svg");
	tooltipdiv = d3.select("#map > .tooltip")
		.style("opacity", 0);

	queue()
		.defer(d3.json, config.mapurl_topojson)
		.defer(d3.json, config.dataurl)
		.await(loadedDataCallback);

	createSlider();

	addLinksToShareButtons();
}

function reset() {
	setDefaultSelections();
	// update everything that varies by source, year and country
	createSlider();
	setCountryInfoAccessText();
	updateColorScale();
	updateLegend();
	updateMapColors();
	updateSideBar();
	removeSelectedBorder();
}

return {init: init};

})();
