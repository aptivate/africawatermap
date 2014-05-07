var path, svg, colorScale, wwmap_config, mapSlider;

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

function wwmapLoadedDataCallback(error, africa, africadata) {
	countries = topojson.feature(africa, africa.objects.subunits).features;

	//dataRange = d3.extent(pluck(africadata, 'water'));
	colorScale = d3.scale.linear()
		.domain([0, 100])  //.domain(dataRange)
		.interpolate(d3.interpolateRgb)
		.range([wwmap_config.waterMinColor, wwmap_config.waterMaxColor]);
	function colorScaleOrDefault(data, id, key) {
		if (data.hasOwnProperty(id)) {
			return colorScale(data[id][key]);
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
				return colorScaleOrDefault(africadata, d.id, 'water');
			})
			.attr("d", path);

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
	var margin = {top: 20, left: 20, bottom: 20, right: 20};
	var width = parseInt(d3.select('#map').style('width'));
	width = (width - margin.left - margin.right) * 0.7;
	var mapRatio = 1.0;
	var height = width * mapRatio;

	//var width = 960, height = 1160;

	var projection = d3.geo.mercator().scale(width/2).translate([width/2, height/2]);
	path = d3.geo.path().projection(projection);

	svg = d3.select("#map").append("svg").attr("width", width).attr("height", height);

	queue()
		.defer(d3.json, config.mapurl)
		.defer(d3.json, config.dataurl)
		.await(wwmapLoadedDataCallback);

	mapSlider = d3.select('#year-slider').call(
		d3.slider().axis(true).min(config.minYear).max(config.maxYear));
}
