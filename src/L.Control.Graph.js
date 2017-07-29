L.Control.Graph = L.Control.extend({
    options: {
        position: "topright",
        theme: "lime-theme",
        width: 1000,
        height: 300,
        margins: {
            top: 10,
            right: 20,
            bottom: 30,
            left: 60
        },
        useHeightIndicator: true,
        interpolation: "linear",
        hoverNumber: {
            decimalsX: 3,
            decimalsY: 0,
            formatter: undefined
        },
        xTicks: undefined,
        yTicks: undefined,
        collapsed: false,
        yAxisMin: undefined,
        yAxisMax: undefined,
        forceAxisBounds: false,
        controlButton: {
            iconCssClass: "elevation-toggle-icon",
            title: "Elevation"
        },
        imperial: false
    },

	/*
	 * Instance of Leaflet map, that the Chart is shown on
	 */
	_map: undefined,

	html: {
		div: undefined,
		svg: undefined
	},

	/*
	 * data sets - hashmap, where every element is in following format:
	 * { data: [],
	 *   x: function(d) {},
	 *   y: function(d) {}
	 * }
	 */
	_data: {},

	/*
	 * All data that is related to showing data from this._data
	 */
	_data_vis: {},

    onRemove: function(map) {
        this._h_div = null;
    },

    onAdd: function(map) {
        this._map = map;
		/* count number of ticks, based on current size */
        var opts = this.options;
        var margin = opts.margins;
        opts.xTicks = opts.xTicks || Math.round(this._width() / 75);
        opts.yTicks = opts.yTicks || Math.round(this._height() / 30);
        opts.hoverNumber.formatter = opts.hoverNumber.formatter || this._formatter;

		/* init html elements*/
        var div = this.html.div = L.DomUtil.create("div", "elevation");
        L.DomUtil.addClass(div, opts.theme); //append theme to control

        var cont = d3.select(div);
        cont.attr("width", opts.width);

        var svg = this.html.svg = cont.append("svg");
        svg.attr("width", opts.width)
            .attr("class", "background")
            .attr("height", opts.height);

		return div;
	},

	getSvgContainer: function() {
		return this.html.svg;
	},

	getPadding: function() {
		return this.options.margins;
	},

	getMaxWidth: function() {
		return this.options.width
			- this.options.margins.top
			- this.options.margins.bottom;
	},

	getMaxHeight: function() {
		return this.options.height
		- this.options.margins.left
		- this.options.margins.right;
	},

	/*
	 * Adds dataset to the database.
	 * If data exists, extends the existing one.
	 *
	 * }
	 */
	addData: function(name, d) {
		if (typeof this._data[name] === "undefined") {
			this._data[name] = {};
		}
		var entry = this._data[name];
		var data = this._data[name].d || []
		data = data.concat(d);
		entry.d = data;
	},

	showData: function(name, x, y, opts) {
		if (typeof this._data[name] === "undefined") {
			throw "Data "+ name +" does not exists."
			return;
		}
		var anim = opts.anim || this.options.animation;
		var type = opts.type || "area";

		//this.setXdomain(name, x);
		//this.setYdomain(name, y);



		var datum = this._data[name].d;
		var vis = {};
		vis.name = name;
		var x_scale = this._x_scale;
		var y_scale = this._y_scale;

		if (type == "area") {
			vis.graph = d3.svg.area()
				.interpolate(this.options.interpolation)
				.x(function(d) { return x_scale(x(d)) })
				.y0(this._height()) // bottom of area
				.y1(function(d) { return y_scale(y(d)) }); // top of area
		}
		else if(type == "line") {
			vis.graph = d3.svg.line()
				.x(function(d) { return x_scale(x(d)) })
				.y(function(d) { return y_scale(y(d)) }); // top of area
		}

		vis.path = this._h_g.append("path");
		/*@TODO refactor this if statement */
		if (type == "area") {
			vis.path.attr("class", "area");
		}

		vis.path.datum(datum).attr("d", vis.graph);
		if (type == "line") {
			/* @TODO adjust styles */
			vis.path.attr("fill", "none")
			      .attr("stroke", "steelblue")
			      .attr("stroke-linejoin", "round")
			      .attr("stroke-linecap", "round")
			      .attr("stroke-width", 1.5);
		}
		this._data_vis[name] = vis;
	},

	setXdomain: function(name, func) {
		if (typeof this._data[name] === "undefined") {
			throw "Data "+ name +" does not exists."
			return;
		}
		var d = d3.extent(this._data[name].d, func);
		this._x_scale.domain(d);
		/* TODO animation */
		this._h_x_axis.call(this._x_axis);
		return d;
	},

	setYdomain: function(data_name, func) {
		if (typeof this._data[data_name] === "undefined") {
			return;
		}
		var d = d3.extent(this._data[data_name].d, func);
		this._y_scale.domain(d);
		/* TODO animation */
		this._h_y_axis.call(this._y_axis);
		return d;
	},

    _width: function() {
        var opts = this.options;
        return opts.width - opts.margins.left - opts.margins.right;
    },

    _height: function() {
        var opts = this.options;
        return opts.height - opts.margins.top - opts.margins.bottom;
    },

	interpolateLatLngs: function(name, granulatiry) {
		if( typeof this._data[name] === "undefined") {
			return;
		}
		var data = this._data[name];

		data.interpolated = [];

		for (var i=0; i<data.d.length-1; i++) {
			var ll1 = new L.LatLng(data.d[i].lla[1], data.d[i].lla[0]);
			var ll2 = new L.LatLng(data.d[i+1].lla[1], data.d[i+1].lla[0]);
			var dist = ll1.distanceTo(ll2);

			data.interpolated.push(ll1);
			var iter = dist/granulatiry|0;
			var d_lat = ll2.lat - ll1.lat;
			//for (var j=0; j<iter; i++) {


		}
	},

	processData: function(name) {
		if( typeof this._data[name] === "undefined") {
			return;
		}
		var opts = this.options;
		var data = this._data[name];
		var d_dist_for_tg = 0;
		var d_ele = 0;
		var last_tg = 0;
		data.dist = 0;
		data.max_ele = 0;

		for (var i=0; i<data.d.length; i++) {
			/* 1. compute distance */
			var s = new L.LatLng(data.d[i].lla[1], data.d[i].lla[0]);
			var e = new L.LatLng(data.d[i ? i - 1 : 0].lla[1], data.d[i ? i - 1 : 0].lla[0]);
			var d_dist = s.distanceTo(e);
			console.log(d_dist);
			data.dist = data.dist + Math.round(d_dist / 1000 * 100000) / 100000;

			/* 2. maximum elevation */
			data.max_ele = data.max_ele < data.d[i].lla[2] ? data.d[i].lla[2] : data.max_ele;

			data.d[i].dist = data.dist;
			data.d[i].latlng = s;

			/* 3. local slope (tg(x)) */
			/*
			try {
				if( d_dist_for_tg > 200.0) {
					data.d[i].slope = last_tg = 100.0 * (d_ele|0.0) / (d_dist_for_tg|0.0);
					d_dist_for_tg = 0.0;
					d_ele = 0.0;
				}
				else {
					d_ele += data.d[i+1].lla[2] - data.d[i].lla[2];
					d_dist_for_tg += d_dist;
					data.d[i].slope = last_tg;
				}
			} catch(err) {
				data.d[i].slope = 0.0;
			}
			*/
		}

		/* calculate slope */
		/*
		for (var i=0; i<data.d.length; i++) {
			var dist = 0.0;
			for( var j=i-5; j<i+5; j++ ) {
				if(j<0 || j+1 > data.d.length) {
					continue;
				}
				try {
					dist += data.d[j].latlng.distanceTo(data.d[j+1].latlng);
				} catch(e) {
					console.log(j);
				}
			}
			var xalt1 = i-5<0 ? 0 : i-5;
			var xalt2 = i+5>=data.d.length ? data.d.length-1 : i+5;

			var d_alt = data.d[xalt2].lla[2] - data.d[xalt1].lla[2];
			data.d[i].slope = 100.0 * (d_alt|0.0) / (dist|0.0);
			//console.log( "x: " +dist+" y: "+ d_alt +" tg: " + data.d[i].slope);
		}
		*/

	},
});

L.control.graph = function(options) {
    return new L.Control.Graph(options);
};



L.Control.Graph.PlotSpace = L.Control.extend({
	options: {
		position: "topright",
		width: 500,
		height: 100,
		padding_left: 20,
		padding_top: 10,
		useHeightIndicator: true,
		interpolation: "linear",
        xTicks: undefined,
        yTicks: undefined,
        collapsed: false,
        yAxisMin: undefined,
        yAxisMax: undefined,
        forceAxisBounds: false,
		imperial: false
	},

	_map: undefined,
	_graph: undefined,

	d3js: {
		svg: undefined,
		g: undefined,
		x_axis: undefined,
		y_axis: undefined,
		x_scale: undefined,
		y_scale: undefined,
	},

	/*
	 * All general html elements, that are constant, no matter what is
	 * currently displayed.
	 *
	 * The hierarchy:
	 * <div>
	 *   <svg> <- container element for all plots
	 *     <g> <- root element for plot
	 *       <path elevation>
	 *       <g x axis>
	 *       <g y axis>
	 *       <g marker> <- mouse marker
	 *       <rect mouse background>
	 */
	html: {
		x_axis: undefined,
		y_axis: undefined,
		bg: undefined,
		plot: {},
		marker: undefined
	},

	_datum: undefined,
	_x_scale: undefined,
	_y_scale: undefined,
/*
	initialize: function(name, opts) {
		L.setOptions(this, opts);
		this.name = name;
	},
*/
	onAdd: function(graph) {
		this._graph = graph;
		this.d3js.svg = this._graph.getSvgContainer();

        this.options.xTicks = this.options.xTicks
				|| Math.round(this.options.width / 75);
        this.options.yTicks = this.options.yTicks
				|| Math.round(this.options.height / 30);
		/*
		 * create <g> group element for the plot
		 */
		this.d3js.g = this.d3js.svg.append("g")
			.attr("transform", "translate(" + this.options.padding_left + "," + this.options.padding_top + ")");

		/* Create scales */
		this.d3js.x_scale = d3.scale.linear()
			.range([0, this.options.width])
			.domain([0,2]);

		this.d3js.y_scale = d3.scale.linear()
			.range([this.options.height, 0])
			.domain([0,2]);

		/* create X and Y axis */
		this.d3js.x_axis = d3.svg.axis()
			.scale(this.d3js.x_scale)
			.ticks(this.options.xTicks)
			.orient("bottom");

		this.d3js.y_axis = d3.svg.axis()
			.scale(this.d3js.y_scale)
			.ticks(this.options.yTicks)
			.orient("left");

		this.html.x_axis = this.d3js.g.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + this.options.height + ")")
			.call(this.d3js.x_axis)
			.append("text")
			.attr("x", this.options.width + 20)
			.attr("y", 15)
			.style("text-anchor", "end")
			.text("km");

		this.html.y_axis = this.d3js.g.append("g")
			.attr("class", "y axis")
			.call(this.d3js.y_axis)
			.append("text")
			.attr("x", -45)
			.attr("y", 3)
			.style("text-anchor", "end")
			.text("m");

		/* create background element and marker */
		return this;
	},

	setWidth: function(w) {
		if (w>100 || w < 0) {
			throw "The value of width is in percent, so it must be in <0:100>";
		}

		this.options.width = w;
		return this;
	},

	setHeight: function(h) {
		if (h>100 || h < 0) {
			throw "The value of height is in percent, so it must be in <0:100>";
		}

		this.options.height = h;
		return this;
	},

	setWidthPx: function(w) {
		if ((this._graph != undefined && this._graph.getMaxGraphWidth() > w) || w < 0) {
			throw "The value of width must be in between <0:" + this._graph.getMaxGraphWidth() + ">";
		}

		this._width_px = w;
		return this;
	},

	setHeightPx: function(h) {
		if ((this._graph != undefined && this._graph.getMaxGraphHeight() > h) || h < 0){
			throw "The value of height must be in between <0:" + this._graph.getMaxGraphWidth()  +">";
		}

		this._width_px = w;
		return this;
	},

	getWidth: function() {
		return this._width_px;
	},

	getHeight: function() {
		return this.__height_px;
	},

	addData: function(name, d) {
		this._data = d;
	},

	/*
	 * opts: {
	 *     interpolate: true/false,
	 *     interpolation_trigger: [n] - value in meters, if the distance 
	 *         between two points is less that n meters, it will interpolate
	 *         the intermediate points
	 * }
	 */
	processData: function(opts) {
		var data = this._data;
		var ndata = [];

		var min_ele = 8848; // Mt Everest
		var max_ele = -10994; // Mariana Trench
		var dist = 0;

		for (var i=0; i<data.length; i++) {
			var s = new L.LatLng(data[i].lla[1], data[i].lla[0]);
			var e = new L.LatLng(data[i ? i - 1 : 0].lla[1], data[i ? i - 1 : 0].lla[0]);
			var d_dist = s.distanceTo(e);
			dist = dist + d_dist; // Math.round(d_dist / 1000 * 100000) / 100000;

			/* 2. maximum elevation */
			max_ele = max_ele < data[i].lla[2] ? data[i].lla[2] : max_ele;
			min_ele = min_ele > data[i].lla[2] ? data[i].lla[2] : min_ele;

			data[i].dist = dist;
			data[i].latlng = s;
			ndata.push(data[i]);

		}
		this._min_ele = min_ele;
		this._max_ele = max_ele;
		this._dist = dist;
		this._data = ndata;
	},

	showPlot: function(x, y, opts) {
		/*
		if (typeof this._data[name] === "undefined") {
			throw "Data "+ name +" does not exists."
			return;
		}*/
		//var anim = opts.anim || this.options.animation;
		var type = opts.type || "area";

		this.setXdomain(x);
		this.setYdomain(y);

		var datum = this._data;
		var vis = {};
		var x_scale = this.d3js.x_scale;
		var y_scale = this.d3js.y_scale;

		if (type == "area") {
			vis.graph = d3.svg.area()
				.interpolate(this.options.interpolation)
				.x(function(d) { return x_scale(x(d)) })
				.y0(this.getHeight()) // bottom of area
				.y1(function(d) { return y_scale(y(d)) }); // top of area
		}
		else if(type == "line") {
			vis.graph = d3.svg.line()
				.x(function(d) { return x_scale(x(d)) })
				.y(function(d) { return y_scale(y(d)) }); // top of area
		}

		vis.path = this.d3js.g.append("path");
		/*@TODO refactor this if statement */
		if (type == "area") {
			vis.path.attr("class", "area");
		}

		vis.path.datum(datum).attr("d", vis.graph);
		if (type == "line") {
			/* @TODO adjust styles */
			vis.path.attr("fill", "none")
			      .attr("stroke", "steelblue")
			      .attr("stroke-linejoin", "round")
			      .attr("stroke-linecap", "round")
			      .attr("stroke-width", 1.5);
		}
		this._vis = vis;
	},

	setXdomain: function(func) {
		var d = d3.extent(this._data, func);
		this.d3js.x_scale.domain(d);
		/* TODO animation */
		this.html.x_axis.call(this.d3js.x_axis);
		return d;
	},

	setYdomain: function(func) {
		var d = d3.extent(this._data, func);
		this.d3js.y_scale.domain(d);
		/* TODO animation */
		this.html.y_axis.call(this.d3js.y_axis);
		return d;
	},

	hidePlot: function(name) {

	},

	addMarker: function(m) {

	},

	removeMarker: function(m) {

	}
});
L.control.graph.plotspace = function(options) {
    return new L.Control.Graph.PlotSpace(options);
};


L.Control.Graph.Data = L.Control.extend({
	_data: [],

	_x_domain_func: undefined,
	_y_domain_func: undefined,

	_x_domain: [0,0],
	_y_domain: [0,0],

	add: function(data) {

	},

	clear: function() {

	},
	
	setXdomainFunc: function(func) {
		this._domain_func = func;
	},

	/*
	 * Computes derivative for the given Y value, storing
	 * the result in z value
	 * 
	 * @param gety getter function for input
	 * @param setz setter function for result
	 */
	derivative: function(gety, setz) {

	},

	interpolate: function() {},

	preprocess: function(i,j, opts) {

	}


});