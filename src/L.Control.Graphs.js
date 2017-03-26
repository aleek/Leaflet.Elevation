L.Control.Graph = L.Control.extend({
    options: {
        position: "topright",
        theme: "lime-theme",
        width: 600,
        height: 175,
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
	_h_div:                undefined,
	  _h_svg:              undefined,
	    _h_g:              undefined,
	      _h_x_axis:       undefined,
	      _h_y_axis:       undefined,
	      _h_mouse_bg:     undefined,
	      _h_mouse_marker: undefined,

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
        var h_div = this._h_div = L.DomUtil.create("div", "elevation");
        L.DomUtil.addClass(h_div, opts.theme); //append theme to control

        var cont = d3.select(h_div);
        cont.attr("width", opts.width);

        var svg = this._h_svg = cont.append("svg");
        svg.attr("width", opts.width)
            .attr("class", "background")
            .attr("height", opts.height);

		var g = this._h_g = svg.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		/* Create scales */
		var x = this._x = d3.scale.linear()
			.range([0, this._width()])
			.domain([0,1]);

		var y = this._y = d3.scale.linear()
			.range([this._height(), 0])
			.domain([0,1]);

		/* create X and Y axis */
		this._h_x_axis = g.append("g");
		this._h_y_axis = g.append("g");

		this._x_axis = d3.svg.axis()
			.scale(this._x)
			.ticks(this.options.xTicks)
			.orient("bottom");

		this._y_axis = d3.svg.axis()
			.scale(this._y)
			.ticks(this.options.yTicks)
			.orient("left");

		this._h_x_axis.attr("class", "x axis")
			.attr("transform", "translate(0," + this._height() + ")")
			.call(this._x_axis)
			.append("text")
			.attr("x", this._width() + 20)
			.attr("y", 15)
			.style("text-anchor", "end")
			.text("km");

		this._h_y_axis.attr("class", "y axis")
			.call(this._y_axis)
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
		var data = this._data[name] || []
		data = data.concat(d);
		this._data[name] = data;
	},

	showData: function(name, x, y, opts) {
	},

	setXdomain: function(data_name, func) {
	},

	setYdomain: function(data_name, func) {
	},

    _width: function() {
        var opts = this.options;
        return opts.width - opts.margins.left - opts.margins.right;
    },

    _height: function() {
        var opts = this.options;
        return opts.height - opts.margins.top - opts.margins.bottom;
    },
});

L.control.graph = function(options) {
    return new L.Control.Graph(options);
};

