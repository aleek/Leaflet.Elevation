L.Control.Graph = L.Control.extend({
    options: {
        position: "topright",
        theme: "lime-theme",
        width: 1200,
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

	/*
	 * All general html elements, that are constant, no matter what is
	 * currently displayed.
	 *
	 * The hierarchy:
	 * <div>
	 *   <svg>
	 *     <g>
	 *       <path elevation> <- all graphs goes in this place (1 graph = 1 html element)
	 *       <g x axis>
	 *       <g y axis>
	 *       <g marker> <- mouse marker
	 *       <rect mouse background>
	 */
	_dom: {
		div: undefined,
		svg: undefined,
		g: undefined,
		x_axis: undefined,
		y_axis: undefined
	},

	_d3js: {
		x_scale: undefined,
		y_scale: undefined,
		x_axis: undefined,
		y_axis: undefined,
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

	/* 
	 * x and y axis d3 instances.
	 * Those are visualized using _h_[xy]_axis elements
	 */
	_x_axis: undefined,
	_y_axis: undefined,

	/* 
	 * linerar scales, used to scale the metric to pixels
	 */
	_x_scale: undefined,
	_y_scale: undefined,

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
        var h_div = this._dom.div = L.DomUtil.create("div", "elevation");
        L.DomUtil.addClass(h_div, opts.theme); //append theme to control

        var cont = d3.select(h_div);
        cont.attr("width", opts.width);

        var svg = this._dom.svg = cont.append("svg");
        svg.attr("width", opts.width)
            .attr("class", "background")
            .attr("height", opts.height);

		var g = this._dom.g = svg.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		/* Create scales */
		var x = this._d3js.x_scale = d3.scale.linear()
			.range([0, this._width()])
			.domain([0,1]);

		var y = this._d3js.y_scale = d3.scale.linear()
			.range([this._height(), 0])
			.domain([0,1]);

		/* create X and Y axis */
		/* Those two are for calucations... */
		this._d3js.x_axis = d3.svg.axis()
			.scale(this._d3js.x_scale)
			.ticks(this.options.xTicks)
			.orient("bottom");

		this._d3js.y_axis = d3.svg.axis()
			.scale(this._d3js.y_scale)
			.ticks(this.options.yTicks)
			.orient("left");

		this._dom.x_axis = g.append("g");
		this._dom.y_axis = g.append("g");

		/* ...and those two are for displaying */
		this._dom.x_axis.attr("class", "x axis")
			.attr("transform", "translate(0," + this._height() + ")")
			.call(this._d3js.x_axis)
			.append("text")
			.attr("x", this._width() + 20)
			.attr("y", 15)
			.style("text-anchor", "end")
			.text("km");

		this._dom.y_axis.attr("class", "y axis")
			.call(this._d3js.y_axis)
			.append("text")
			.attr("x", -45)
			.attr("y", 3)
			.style("text-anchor", "end")
			.text("m");

		return h_div;
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
		var x_scale = this._d3js.x_scale;
		var y_scale = this._d3js.y_scale;

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

		if (type == "area") {
			vis.path = this._dom.g.append("path").attr("class", "area");
		}
		else
		{
			vis.path = this._dom.g.append("path");
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
		this._d3js.x_scale.domain(d);
		/* TODO animation */
		this._dom.x_axis.call(this._d3js.x_axis);
		return d;
	},

	setYdomain: function(data_name, func) {
		if (typeof this._data[data_name] === "undefined") {
			return;
		}
		var d = d3.extent(this._data[data_name].d, func);
		this._d3js.y_scale.domain(d);
		/* TODO animation */
		this._dom.y_axis.call(this._d3js.y_axis);
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

	processData: function(name) {
		if( typeof this._data[name] === "undefined") {
			return;
		}
		var opts = this.options;
		var data = this._data[name];
		data.dist = 0;
		data.max_ele = 0;

		for (var i=0; i<data.d.length; i++) {
			var s = new L.LatLng(data.d[i].lla[1], data.d[i].lla[0]);
			var e = new L.LatLng(data.d[i ? i - 1 : 0].lla[1], data.d[i ? i - 1 : 0].lla[0]);
			var newdist = s.distanceTo(e);
			data.dist = data.dist + Math.round(newdist / 1000 * 100000) / 100000;
			data.max_ele = data.max_ele < data.d[i].lla[2] ? data.d[i].lla[2] : data.max_ele;

			data.d[i].dist = data.dist;
			data.d[i].coords = s;
		}
		console.log("Total total_dist:. " + data.d[data.d.length].dist );
	},

	interpolated: [],

	interpolateData: function(name, resolution) {
		if( typeof this._data[name] === "undefined") {
			return;
		}
		var opts = this.options;
		var data = this._data[name];
		var interpolated = [];
		var id = 0;
		
		var item = Object.assign({}, data.d[0]);
		item.id = id;
		item.coords = new L.LatLng(item.lla[1], item.lla[0], item.lla.length == 3 ? item.lla[2] : -20000);
		delete item.lla;
		item.total_dist = 0;
		item.dist = 0;
		item.interpolated = false;
		interpolated.push(item);
		id++;

		var prev_item = item;

		/* If the distance between two points is greater than resolution,
		 * we need to insert couple of elements, by interpolation
		 */
		for (var i=1; i<data.d.length; i++) {
			var item = Object.assign({}, data.d[i]);
			item.id = id;
			id++;
			item.coords = new L.LatLng(item.lla[1], item.lla[0], item.lla.length == 3 ? item.lla[2] : -20000);
			delete item.lla;
			item.dist = item.coords.distanceTo(prev_item.coords);
			item.total_dist = prev_item.total_dist + item.dist;
			item.interpolated = false;

			/* insert interpolated items, if the distance is too big */
			if (item.dist > resolution) {
				var n_interp = Math.floor(item.dist / resolution) + 1;

				for (var j=1; j<n_interp; j++) {
					var lat = ((n_interp - j)*prev_item.coords.lat + j*item.coords.lat)/n_interp;
					var lng = ((n_interp - j)*prev_item.coords.lng + j*item.coords.lng)/n_interp;
					var alt = ((n_interp - j)*prev_item.coords.alt + j*item.coords.alt)/n_interp;

					var ii = {}; // interpolated item
					ii.id = id;
					id++;
					ii.coords = new L.LatLng(lat, lng, alt);
					ii.dist = interpolated[interpolated.length-1].coords.distanceTo(ii.coords);
					ii.total_dist = interpolated[interpolated.length-1].total_dist + ii.dist;
					ii.interpolated = true;
					interpolated.push(ii);
				}
			}
			/* 
			 * After we raped the array by inserting additional elements,
			 * we have to adjust the next one
			 */
			item.dist = interpolated[interpolated.length-1].coords.distanceTo(item.coords);
			interpolated.push(item);
			prev_item.next_real_item = interpolated.length-1;
			prev_item = item;
		}

		this._data[name].d = interpolated;

		var new_total_dist = 0.0;
		for (var i=0; i<interpolated.length; i++) {
			new_total_dist += interpolated[i].dist;
		}
		this._data[name].interpolated_dist = new_total_dist;
		console.log("Interpolated total_dist: " + new_total_dist );
	},

	calculateDerivative: function(name) {
		if( typeof this._data[name] === "undefined") {
			return;
		}
		var data = this._data[name].d;

		for (var i=5; i<data.length-5; i++) {
			var pos1 = data[i-5];
			var pos2 = data[i+5];
			data[i].tg =  (pos2.coords.alt - pos1.coords.alt)/(pos2.dist);
		}
		for (var i=0; i<5; i++) {
			data[i].tg = 0; //data[5];
		}
		for (var i=data.length-5; i<data.length; i++) {
			data[i].tg = 0; //data[data.length-6];
		}
		
/*
		for (var i=1; i<data.length; i++) {
			var pos1 = data[i-1];
			var pos2 = data[i];
			data[i].tg =  (pos2.coords.alt - pos1.coords.alt)/(pos2.dist);
		}
		data[0].tg = data[1].tg;
*/
	},
});

L.control.graph = function(options) {
    return new L.Control.Graph(options);
};

