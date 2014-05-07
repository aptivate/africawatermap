var margin, width, mapRatio, height, projection, path, svg;

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

function loadedDataCallback(error, africa, africadata) {
	countries = topojson.feature(africa, africa.objects.subunits).features;

	dataRange = d3.extent(pluck(africadata, 'water'));
	var colorScale = d3.scale.linear()
		.domain(dataRange)
		.interpolate(d3.interpolateRgb)
		.range(["#ff5a00", "#47ff00"]);
	function colorScaleOrDefault(data, id, key) {
		if (data.hasOwnProperty(id)) {
			return colorScale(data[id][key]);
		} else {
			return '#eee';
		}
	}

	svg.selectAll(".subunit")
		.data(countries)
		.enter()
			.append("path")
			.attr("class", function(d) { return "country " + d.id; })
			.style("fill", function(d) { return colorScaleOrDefault(africadata, d.id, 'water'); })
			.attr("d", path);
}

function wwmap_init(config) {
	margin = {top: 20, left: 20, bottom: 20, right: 20};
	width = parseInt(d3.select('#map').style('width'));
	width = (width - margin.left - margin.right) * 0.7;
	mapRatio = 1.0;
	height = width * mapRatio;

	//var width = 960, height = 1160;

	projection = d3.geo.mercator().scale(width/2).translate([width/2, height/2]);
	path = d3.geo.path().projection(projection);

	svg = d3.select("#map").append("svg").attr("width", width).attr("height", height);

	queue()
		.defer(d3.json, config.mapurl)
		.defer(d3.json, config.dataurl)
		.await(loadedDataCallback);


	d3.select('#year-slider').call(
		d3.slider().axis(true).min(config.minYear).max(config.maxYear));
}
