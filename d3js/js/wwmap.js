var wwMap = (function() {

var config, allData, mapData, translations,
	selectedCountry, selectedYear, selectedSource,
	path, mapsvg, colorScale, mapSlider, tooltipdiv,
	graphsvg, lgX, lgY,
	colorDomain, extColorDomain;

// from http://stackoverflow.com/a/979995/3189
var QueryString = function () {
	// This function is anonymous, is executed immediately and 
	// the return value is assigned to QueryString!
	var query_string = {};
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i=0;i<vars.length;i++) {
		var pair = vars[i].split("=");
			// If first entry with this name
		if (typeof query_string[pair[0]] === "undefined") {
			query_string[pair[0]] = pair[1];
			// If second entry with this name
		} else if (typeof query_string[pair[0]] === "string") {
			var arr = [ query_string[pair[0]], pair[1] ];
			query_string[pair[0]] = arr;
			// If third or later entry with this name
		} else {
			query_string[pair[0]].push(pair[1]);
		}
	}
	return query_string;
} ();

function replaceBodyWithFallbackImage() {
	// delete the main html
	// replace with img tag with screenshot of data vis, and some text
	// might need to dynamically load jquip to do this with old browsers
	var wrapper = document.getElementById("wrapperdiv");
	document.body.removeChild(wrapper);

	var explanation = document.getElementById("fallback-text");
	explanation.className = "show";

	var image = document.createElement("img");
	image.setAttribute("src", "images/fallback.png");
	document.body.appendChild(image);
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

function capitaliseFirstLetter(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getTranslation(translationKey, capitalise) {
	capitalise = (typeof capitalise === "undefined") ? false : capitalise;
	if (translations.hasOwnProperty(translationKey)) {
		if (capitalise) {
			return capitaliseFirstLetter(translations[translationKey]);
		} else {
			return translations[translationKey];
		}
	} else {
		console.log("Could not find translation of " + translationKey);
	}
}

function setSelectionText(selector, translationKey, capitalise) {
	var translated = getTranslation(translationKey, capitalise);
	if (translated) {
		d3.select(selector).text(translated);
	}
}

function setSelectionHtml(selector, translationKey, capitalise) {
	var translated = getTranslation(translationKey, capitalise);
	if (translated) {
		d3.select(selector).html(translated);
	}
}

function setSelectionTitle(selector, translationKey, capitalise) {
	var translated = getTranslation(translationKey, capitalise);
	if (translated) {
		d3.select(selector).attr("title", translated);
	}
}

/* translate the text up to the first html tag
 */
function setSelectionLeadingText(selector, translationKey, capitalise) {
	var translated = getTranslation(translationKey, capitalise);
	if (translated) {
		var selection = d3.select(selector);
		var origHtml = selection.html();
		selection.html(translated + origHtml.substring(origHtml.indexOf('<')));
	}
}

/* Update the text in the file
 */
function updateStaticText() {
	// map info section
	setSelectionText("#fallback-title", "Africa Water Map");
	setSelectionHtml("#fallback-text", "browser fallback");
	setSelectionLeadingText("#map-info-title", "map info title");
	setSelectionLeadingText(".map-info > h1 > span.big", selectedSource)
	setSelectionHtml(".instructions", "instructions");
	setSelectionText("#select-water-source", "water", true);
	setSelectionText("#select-sanitation-source", "sanitation", true);
	setSelectionText("#reset-button", "Reset");

	// sharing section
	setSelectionLeadingText(".social-share > h2", "share")
	setSelectionTitle("#twitter-search-link", "follow africa water map");
	setSelectionTitle(".ss-share-link.ico-facebook", "share on facebook");
	setSelectionTitle(".ss-share-link.ico-twitter", "share on twitter");
	setSelectionTitle(".ss-share-link.ico-google", "share on google");
	setSelectionTitle(".ss-share-link.ico-linkedin", "share on linkedin");
	setSelectionTitle(".ss-share-link.ico-embed", "embed this map");
	setSelectionLeadingText(".embed-example", "you can embed this map");

	// targets section
	setSelectionText(".targets-title", "Everyone, Everywhere by 2030");
	setSelectionText(".currently > .targets-section-title", "currently");
	setSelectionText(".for-target > .targets-section-title", "for targets");
	setSelectionText(".for-target > .targets-detail", "extra people per year");
	setSelectionHtml(".targets-percent", "That is just % of the population");

	setSelectionText(".map-description > h3", "about this map");
	setSelectionText("#description-about", "this map shows which ...");
	setSelectionText("#description-more-info > a", "find out more");

	// footer
	setSelectionText("#map-by", "map by");
}

function toggleEmbedCode() {
	var embedCode = d3.select(".embed-example");
	if (embedCode.style("display") == "none") {
		embedCode.style("display", "block");
	} else {
		embedCode.style("display", "none");
	}
}

function updateSocialText() {
	// work out iframe parent link - from http://stackoverflow.com/a/7739035/3189
	var pageUrl = (window.location != window.parent.location) ? document.referrer: document.location;
	var encodedUrl = encodeURIComponent(pageUrl);
	var hashTag;
	if (selectedSource == "water") {
		hashTag = config.twitterHashTagWater;
	} else {
		hashTag = config.twitterHashTagSanitation;
	}
	var twitterText =
		encodeURIComponent(getTranslation("twitter share text " + selectedSource));
	var otherText =
		encodeURIComponent(getTranslation("other share text " + selectedSource));
	var title =
		encodeURIComponent(getTranslation("Africa Water Week"));

	d3.select("#twitter-search-link")
		.attr("href", "https://twitter.com/#" + hashTag)
		.text(" #" + hashTag);

	d3.select(".ss-share-link.ico-facebook")
		//.attr("href", "http://www.facebook.com/sharer.php?u=" + encodedUrl);
		.attr("href", "https://www.facebook.com/sharer.php?s=100&p[title]=" + title +
			"&p[summary]=" + otherText +
			"&p[url]=" + encodedUrl);

	d3.select(".ss-share-link.ico-twitter")
		.attr("href", "https://twitter.com/share?text=" + twitterText +
			"&url=" + encodedUrl +
			"&hashtags=africawaterweek");

	d3.select(".ss-share-link.ico-google")
		.attr("href", "https://plus.google.com/share?url=" + encodedUrl);

	d3.select(".ss-share-link.ico-linkedin")
		.attr("href", "https://www.linkedin.com/shareArticle?mini=true&url=" + encodedUrl +
			"&title=" + title +
			"&summary=" + otherText);

	// looks like facebook uses meta tags, so insert some stuff there
	var metaTag = document.getElementsByTagName('meta');
	for (var i = 0; i < metaTag.length; i++) {
		if (metaTag[i].getAttribute("property") == "og:description") {
			metaTag[i].content = otherText;
		}
		if (metaTag[i].getAttribute("property") == "og:title") {
			metaTag[i].content = title;
		}
	}
}

function addLinksToShareButtons() {
	updateSocialText();

	d3.select(".ss-share-link.ico-embed")
		.on("click", toggleEmbedCode);
}

/* Check if URL parameters request logo removal, and remove them if they do
 */
function checkLogoRemoval() {
	if (QueryString.hasOwnProperty("logo")) {
		if (QueryString.logo == "none") {
			d3.select(".logos").selectAll("*").remove();
		}
	}
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

/* totalPeople is people to draw on this side
 * maxPeople is max people to draw on either side - we use it to set person
 * size so that both sides use the same size people
 */
function drawPeople(totalPeople, maxPeople, current_or_target) {
	var divSelector, personClass, rightAlign;
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

	totalPeople = Math.round(totalPeople);
	maxPeople = Math.round(maxPeople);

	var personDiv = d3.select(divSelector);
	// remove everything inside the div
	personDiv.selectAll("*").remove();

	// add the graph
	var personDivInner = personDiv.append("div")
	var width = parseInt(personDivInner.style('width'));
	var height;
	if (totalPeople <= 10) {
		height = 0.25 * width;
	} else {
		height = 0.5 * width;
	}
	var personHeight = 0.2 * width;

	var vis = personDivInner.append("svg:svg")
		.attr("id", "country-targets-vis")
		.attr("width", width)
		.attr("height", height);

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

function updatePersonKey(peopleUnits) {
	var personHeight = config.personFullHeight;

	var width = personHeight;
	var height = personHeight;

	var personDiv = d3.select("#targets-key-person");
	// remove everything inside the div
	personDiv.selectAll("*").remove();
	var vis = personDiv.append("svg:svg")
		.attr("id", "country-targets-vis")
		.attr("width", width)
		.attr("height", height);

	drawPeopleRow(1, vis, 0, 0, personHeight, "key");

	var key_text = " = " + numberWithCommas(peopleUnits) + " " + getTranslation("people");
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

	var k = {number: 1000, abbrev: getTranslation("one_letter_1000")};
	var m = {number: 1000000, abbrev: getTranslation("one_letter_1000000")};

	if (minNumber == 0) {
		if (maxNumber < 1000000) {
			return k;
		} else {
			return m;
		}

	} else {
		if (maxNumber < 1000000) {
			return k;
		} else if (minNumber >= 100000) {
			return m;
		} else {
			return k;
		}
	}
}

/* converts number to numbers + m/k for million/thousand */
function numberAndUnitsToDigits(number, units) {
	number = number / units.number;

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
	var countryName = getCountryName(d.id);
	// set the width according to the length of the country name, but don't
	// get too small
	var ttWidth = Math.max(6, countryName.length*0.7);
	d3.select(".tooltip-year").text(selectedYear.toString());
	d3.select(".tooltip-country").text(countryName);
	d3.select(".tooltip-percent").text(coverage.toFixed(1) + "%");
	tooltipdiv.transition()
		.duration(200)
		.style("opacity", 0.9);
	var box = d3.select("#map")[0][0].getBoundingClientRect();
	tooltipdiv
		.style("width", ttWidth + "em")
		.style("left", (d3.event.pageX - box.left + 10) + "px")
		.style("top", (d3.event.pageY - box.top - 100) + "px");
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
	drawLineGraphYearLine();
	setCountryInfoAccessText();
	updateMapColors();
}

function setSource(source) {
	selectedSource = source;
	// update everything that varies by source
	d3.select("#wrapperdiv").attr("class", "wrapper " + selectedSource);
	updateMapInfo();
	setCountryInfoAccessText();
	updateColorScale();
	updateLegend();
	updateMapColors();
	updateSideBar();
	updateSelectedBorder();
	updateSocialText();
}

function getCountryName(country_code) {
	if (allData.hasOwnProperty(country_code)) {
		return getTranslation(allData[country_code]["name"]);
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
		title = getTranslation("access to water");
	} else {
		title = getTranslation("access to sanitation");
	}
	d3.select("#map-legend-label")
		.text(title);
}

/*
 * set the text in the main title and update the buttons
 */
function updateMapInfo() {
	var extraSpace; // whether to leave blank space under the title
	if (selectedSource == "water") {
		d3.select("#select-water-source").attr("class", "button source current-source");
		d3.select("#select-sanitation-source").attr("class", "button source");
		extraSpace = "<br />&nbsp";
	} else {
		d3.select("#select-water-source").attr("class", "button source");
		d3.select("#select-sanitation-source").attr("class", "button source current-source");
		extraSpace = "";
	}

	d3.select(".map-info > h1 > span.big")
		.attr("class", "big " + selectedSource)
		.text(getTranslation(selectedSource))
		.append("strong").text(" " + config.minYear.toString() + "-" +
			config.maxYear.toString())
		.append("span").html(extraSpace);
}

function setCountryInfoAccessText() {
	var accessText;
	var percentValue = valueForCountry(selectedCountry, selectedYear).toFixed(1);
	if (selectedSource == 'water') {
		accessText = getTranslation('of people have access to water');
	} else {
		accessText = getTranslation('of people have access to sanitation');
	}
	var accessTextElement = d3.select("#country-info-access-text");
	accessTextElement.selectAll("*").remove();
	var percentSpan = accessTextElement.append("span")
		.attr("class", "access-percentage")
		.text(percentValue);
	percentSpan.append("span")
		.attr("class", "percent-sign")
		.text("%");
	accessTextElement.append("span").text(" " + accessText + " ");
	accessTextElement.append("span")
		.attr("class", "in-year")
		.text("in " + selectedYear.toString());
	accessTextElement.append("span")
		.attr("class", "actual-projected")
		.text(" (" + getTranslation("actual and projected") + ")");
}

function drawLineGraphYearLine() {
	// TODO: replace with something nicer
	/*d3.select(".year-line").remove();
	graphsvg.append("svg:line")
		.attr("class", "year-line")
		.attr("x1", lgX(selectedYear))
		.attr("y1", -1 * lgY(0))
		.attr("x2", lgX(selectedYear))
		.attr("y2", -1 * lgY(100));*/
}

function plotAllYearData() {
	var countryInfo = d3.select("#country-info");
	// remove everything inside the country-info div
	countryInfo.selectAll("*").remove();
	// put title stuff in
	countryInfo.append("div")
		.attr("class", "country-info-year")
		.text(selectedYear.toString());
	countryInfo.append("h2")
		.text(getCountryName(selectedCountry));
	countryInfo.append("p")
		.attr("id", "country-info-access-text");
	setCountryInfoAccessText();

	// add the graph div
	var visDiv = countryInfo.append("div")
		.attr("id", "country-info-graph");
	var visDivInner = visDiv.append("div")
		.attr("class", "inner");

	// dimensions of line graph
	var width = parseInt(visDivInner.style('width'));
	var height = config.lineGraphAspectRatio * width;

	var margin = {left: 30, right: 15, top: 6, bottom: 20};
	lgY = d3.scale.linear()
		.domain([0, 100])
		.range([0 + margin.bottom, height - margin.top]);
	lgX = d3.scale.linear()
		.domain([config.minYear, config.maxYear])
		.range([0 + margin.left, width - margin.right]);

	// add the graph svg
	var vis = visDivInner.append("svg:svg")
		.attr("width", width)
		.attr("height", height);

	graphsvg = vis.append("svg:g")
		.attr("transform", "translate(0, " + height.toString() + ")");

	var minYearValue = valueForCountry(selectedCountry, config.minYear);
	var thisYearValue = valueForCountry(selectedCountry, config.thisYear);
	var maxYearValue = valueForCountry(selectedCountry, config.maxYear);

	// the graph lines
	graphsvg.append("svg:line")
		.attr("class", "history")
		.attr("x1", lgX(config.minYear))
		.attr("y1", -1 * lgY(minYearValue))
		.attr("x2", lgX(config.thisYear))
		.attr("y2", -1 * lgY(thisYearValue));

	if (maxYearValue > 99.9) {
		// handle the case where we hit 100% before maxYear
		var year100 = findYear100(selectedCountry);
		graphsvg.append("svg:line")
			.attr("class", "projection")
			.attr("x1", lgX(config.thisYear))
			.attr("y1", -1 * lgY(thisYearValue))
			.attr("x2", lgX(year100))
			.attr("y2", -1 * lgY(100));

		graphsvg.append("svg:line")
			.attr("class", "projection")
			.attr("x1", lgX(year100))
			.attr("y1", -1 * lgY(100))
			.attr("x2", lgX(config.maxYear))
			.attr("y2", -1 * lgY(100));

	} else {
		graphsvg.append("svg:line")
			.attr("class", "projection")
			.attr("x1", lgX(config.thisYear))
			.attr("y1", -1 * lgY(thisYearValue))
			.attr("x2", lgX(config.maxYear))
			.attr("y2", -1 * lgY(maxYearValue));

		// the plotted line to achieve universal access
		// but only plot it if we won't reach it anyway
		graphsvg.append("svg:line")
			.attr("class", "universal")
			.attr("x1", lgX(config.thisYear))
			.attr("y1", -1 * lgY(thisYearValue))
			.attr("x2", lgX(config.maxYear))
			.attr("y2", -1 * lgY(100));
	}
	// the axes
	graphsvg.append("svg:line")
		.attr("class", "axis")
		.attr("x1", lgX(config.minYear))
		.attr("y1", -1 * lgY(0))
		.attr("x2", lgX(config.maxYear))
		.attr("y2", -1 * lgY(0));
	graphsvg.append("svg:line")
		.attr("class", "axis")
		.attr("x1", lgX(config.minYear))
		.attr("y1", -1 * lgY(0))
		.attr("x2", lgX(config.minYear))
		.attr("y2", -1 * lgY(100));

	// the ticks on the axes
	graphsvg.selectAll(".xLabel")
		.data(config.yearsOnGraph)
		.enter().append("svg:text")
		.attr("class", "xLabel")
		.text(String)
		.attr("x", function(d) { return lgX(d); })
		.attr("y", 0)
		.attr("text-anchor", "middle");
	graphsvg.selectAll(".yLabel")
		.data(lgY.ticks(3))
		.enter().append("svg:text")
		.attr("class", "yLabel")
		.text(String)
		.attr("x", 0)
		.attr("y", function(d) { return -1 * lgY(d); })
		.attr("text-anchor", "right")
		.attr("dy", 4);

	graphsvg.selectAll(".xTicks")
		.data(config.yearsOnGraph)
		.enter().append("svg:line")
		.attr("class", "xTicks")
		.attr("x1", function(d) { return lgX(d); })
		.attr("y1", -1 * lgY(0))
		.attr("x2", function(d) { return lgX(d); })
		.attr("y2", -1 * lgY(-5));
	graphsvg.selectAll(".yTicks")
		.data(lgY.ticks(3))
		.enter().append("svg:line")
		.attr("class", "yTicks")
		.attr("x1", lgX(config.minYear))
		.attr("y1", function(d) { return -1 * lgY(d); })
		.attr("x2", lgX(config.minYear-1))
		.attr("y2", function(d) { return -1 * lgY(d); });

	// finally add the year line
	drawLineGraphYearLine();
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
		d3.select(".currently .targets-number-unit").text(units.abbrev);

		if (popUniversal > 0) {
			d3.select(".for-target .targets-number-digits").text(digitsUniversal);
			d3.select(".for-target .targets-number-unit").text(units.abbrev);
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
				.text(getTranslation("Total number of new people gaining access to water"));
			d3.select(".currently > .targets-detail")
				.text(getTranslation("more people per year will gain access to water"));
		} else {
			d3.select(".targets-subtitle")
				.text(getTranslation("Total number of new people gaining access to sanitation"));
			d3.select(".currently > .targets-detail")
				.text(getTranslation("more people per year will gain access to sanitation"));
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

function loadedDataCallback(error, africa, dataset, langData) {
	allData = dataset;
	mapData = africa;
	translations = langData;

	updateStaticText();

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

	createSlider();

	addLinksToShareButtons();

	checkLogoRemoval();

	// causes trouble for IE 9 - so do it last
	tooltipdiv.style("opacity", 0);
}

function setDefaultSelections() {
	selectedCountry = config.initialCountry;
	selectedYear = config.thisYear;
}

function init(mapconfig) {
	config = mapconfig;

	// check for svg support
	if (!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1")) {
		replaceBodyWithFallbackImage();
		return;
	}
	// we don't want to reset source on reset button
	selectedSource = config.initialSource;
	setDefaultSelections();

	var width = parseInt(d3.select('#map').style('width'));
	var mapRatio = 1.1;
	var height = width * mapRatio;

	colorDomain = [10, 20, 30, 40, 50, 60, 70, 80, 90, 101];
	extColorDomain = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

	var lang = "en";
	if (QueryString.hasOwnProperty("lang")) {
		lang = QueryString.lang;
	}
	var lang_url = 'data/lang_' + lang + '.json';

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

	tooltipdiv = d3.select("#map > .tooltip");

	queue()
		.defer(d3.json, config.mapurl_topojson)
		.defer(d3.json, config.dataurl)
		.defer(d3.json, lang_url)
		.await(loadedDataCallback);
}

function reset() {
	setDefaultSelections();
	selectedYear = config.minYear;
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
