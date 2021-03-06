// taken from http://stackoverflow.com/a/30056867/607041, thanks!
Array.matrix = function(numrows, numcols, initial) {
    var arr = [];
    for (var i = 0; i < numrows; ++i) {
        var columns = [];
        for (var j = 0; j < numcols; ++j) {
            columns[j] = initial;
        }
        arr[i] = columns;
    }
    return arr;
}


var plot_width = parseInt(d3.select("body").select("#chart").style('width'), 10);
var margin = {top: 60, right: 30, bottom: 50, left: 60};
var width = plot_width - margin.left - margin.right;
var height = Math.min(plot_width - margin.top - margin.bottom, 700);
var plot_height = height + margin.top + margin.bottom;

var ex_chart = example().zoom(true);

var data_points = [];
var hasTile = true;
var tiles = {};
var tiles_current = [];

//var time_format = d3.time.format("%e %b %y");
var n_ticks_x = 10;

var scale_fac_y = 1.0;
var offset_y = 1.0;
var scale_fac_x = 1.0;
var offset_x = 1.0;

var filename = 'out.geojson';

d3.json(filename, function(json) {
    var coordinates = json.features[0].geometry.coordinates;
    scale_fac_y = json.features[0].properties.scale_fac_y;
    offset_y = json.features[0].properties.offset_y;
    scale_fac_x = json.features[0].properties.scale_fac_x;
    offset_x = json.features[0].properties.offset_x;
    console.log(scale_fac_x);
    console.log(offset_x);
    for (var i in coordinates)
    {
        data_points.push([coordinates[i][0]*scale_fac_x+offset_x, (coordinates[i][1]+45)*scale_fac_y+offset_y]);
    }
    data_points.forEach(function(d) { d.time = new Date(d[0]*1000); });

    d3.select('#chart')
        .append("svg")
        .attr("width", window.innerWidth)
        .attr("height",window.innerHeight)
        .call(ex_chart);
});


function long2tile(lon, zoom) {
    return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
}

function lat2tile(lat, zoom) {
    return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
}


function example() {
    var svg;
    var xaxis = d3.svg.axis();
    var yaxis = d3.svg.axis();
    var xscale = d3.time.scale();
//    xscale.tickFormat(time_format);
//    var yscale = d3.scale.linear();
    var yscale = d3.scale.log().base(10);
    var zoomable = true;

    var zoomlevel = 0;
    var zoomlevel_previous = zoomlevel;

    var xyzoom = d3.behavior.zoom()
        .x(xscale)
        .y(yscale)
        .on("zoom", zoomable ? draw : null);

    var xzoom = d3.behavior.zoom()
        .x(xscale)
        .on("zoom", zoomable ? draw : null);

    var yzoom = d3.behavior.zoom()
        .y(yscale)
        .on("zoom", zoomable ? draw : null);

    // Define the line
    var valueline = d3.svg.line()
        .x(function(d) { return X(d); })
        .y(function(d) { return Y(d); });

    function chart(selection) {
        console.log('create chart');
        console.log(selection);
        svg = selection.append('svg');
        var g = svg.append('g')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        g.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", plot_width - margin.left - margin.right)
            .attr("height", plot_height - margin.top - margin.bottom);

        g.append("svg:rect")
            .attr("class", "border")
            .attr("width", plot_width - margin.left - margin.right)
            .attr("height", plot_height - margin.top - margin.bottom)
            .style("stroke", "black")
            .style("fill", "none");

        g.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(" + 0 + "," + (plot_height - margin.top - margin.bottom) + ")");

        g.append("g")
            .attr("class", "y axis");

        g.append("g")
            .attr("class", "scatter")
            .attr("clip-path", "url(#clip)");

        g.append("path")
            .attr("class", "line")
            .attr("clip-path", "url(#clip)")
            .attr("width", plot_width - margin.left - margin.right)
            .attr("height", plot_height - margin.top - margin.bottom);

        var focus = g.append("g")
            .style("display", "none");

        g.append("svg:rect")
            .attr("class", "zoom xy box")
            .attr("width", plot_width - margin.left - margin.right)
            .attr("height", plot_height - margin.top - margin.bottom)
            .style("visibility", "hidden")
            .attr("pointer-events", "all")
            .on("mouseover", function() { focus.style("display", null); })
            .on("mouseout", function() { focus.style("display", "none"); })
            .on("mousemove", mousemove);

        g.append("svg:rect")
            .attr("class", "zoom x box")
            .attr("width", plot_width - margin.left - margin.right)
            .attr("height", plot_height - margin.top - margin.bottom)
            .attr("transform", "translate(" + 0 + "," + (plot_height - margin.top - margin.bottom) + ")")
            .style("visibility", "hidden")
            .attr("pointer-events", "all")
            .call(xzoom);

        g.append("svg:rect")
            .attr("class", "zoom y box")
            .attr("width", margin.left)
            .attr("height", height - margin.top - margin.bottom)
            .attr("transform", "translate(" + -margin.left + "," + 0 + ")")
            .style("visibility", "hidden")
            .attr("pointer-events", "all")
            .call(yzoom);

        // Update the x-axis
        xscale.domain(d3.extent(data_points, function(d) { return d.time; }));
        xscale.range([0, plot_width - margin.left - margin.right]);

        xaxis.scale(xscale)
            .orient('bottom')
            .ticks(n_ticks_x)
//                    .tickFormat(time_format)
            .tickPadding(10);

        // Update the y-scale.
        yscale.domain(d3.extent(data_points, function(d) { return d[1]; }))
        yscale.range([plot_height - margin.top - margin.bottom, 0]);

        yaxis.scale(yscale)
            .orient('left')
            .ticks(15, "d")
            .tickSize(6, 0)
            .innerTickSize(-width)
            .outerTickSize(0)
            .tickPadding(10);
//            yaxis.tickValues([0, 1, 2, 3, 5, 7, 10, 20, 40, 100, 150, 200, 300, 400]);

        var bisectDate = d3.bisector(function(d) { return d.time; }).left;

        // append the circle at the intersection
        focus.append("circle")
            .attr("class", "y")
            .style("fill", "none")
            .style("stroke-width", 3)
            .style("stroke", "black")
            .attr("r", 5);

        // place the value at the intersection
        focus.append("text")
            .attr("class", "y1")
            .style("stroke", "black")
            .style("stroke-width", "3.5px")
            .style("opacity", 0.8)
            .attr("dx", 8)
            .attr("dy", "-.3em");

        focus.append("text")
            .attr("class", "y2")
            .style("fill", "white")
            .attr("dx", 8)
            .attr("dy", "-.3em");

        // place the date at the intersection
        focus.append("text")
            .attr("class", "y3")
            .style("stroke", "black")
            .style("stroke-width", "3.5px")
            .style("opacity", 0.8)
            .attr("dx", 8)
            .attr("dy", "1em");

        focus.append("text")
            .attr("class", "y4")
            .style("fill", "white")
            .attr("dx", 8)
            .attr("dy", "1em");

        function mousemove() {
//                console.log('mousemove', data.length);
            var x0 = xscale.invert(d3.mouse(this)[0]);
            var i = bisectDate(data_points, x0, 1);
            if (i > 0 && i < data_points.length) {
                var d0 = data_points[i - 1];
                var d1 = data_points[i];
                var d = x0 - d0.time > d1.time - x0 ? d1 : d0;
            } else { // mouse is outside the plot area, i is not valid
                var d = data_points[data_points.length-1];
            }

            focus.select("circle.y")
                .attr("transform",
                      "translate(" + xscale(d.time) + "," +
                                     yscale(d[1]) + ")");

            var formatDate = d3.time.format("%d %b %H:%M");

            var tooltip_x = xscale(d.time) - 100;
            var tooltip_y = xscale(d[1]) - 30;
            var translate_str = "translate(" + tooltip_x + "," + tooltip_y + ")";

            focus.select("text.y1")
                .attr("transform", translate_str)
                .text(Math.round(d[1]) + ' ' + 'meter');

            focus.select("text.y2")
                .attr("transform", translate_str)
                .text(Math.round(d[1]) + ' ' + 'meter');

            focus.select("text.y3")
                .attr("transform", translate_str)
                .text(formatDate(d.time));

            focus.select("text.y4")
                .attr("transform", translate_str)
                .text(formatDate(d.time));

//                console.log(d.time);
//                console.log(d[1]);
        }

        draw();

        return chart;
    }

    function update() {
//        console.log('update begin');
        var gs = svg.select("g.scatter");
        var circle = gs.selectAll("circle");
        data_points.forEach(function(d) { d.time = new Date(d[0] * 1000); });  // from posix seconds to ms
//        update_path();
        update_circles(circle);
//        console.log('update end');
    }

    function update_path() {
        var pathline = svg.select("path.line");
        pathline.attr("d", valueline(data_points));
    }

    function update_circles(circle) {
        circle = circle = circle.data(data_points, function(d) { return d; });
        circle.enter().append("svg:circle")
            .attr("class", "marker")
            .attr("cx", function(d) {return X(d);})
            .attr("cy", function(d) {return Y(d);})
            .attr("r", 2);

        circle.attr("cx", function(d) { return X(d); })
              .attr("cy", function(d) { return Y(d); });

        circle.exit().remove();
    }

    function calc_zoom_level(lon_min, lon_max, lat_min, lat_max) {
        var range_lat = Math.abs(lat_max-lat_min);
        var range_lon = Math.abs(lon_max-lon_min);
        var area = range_lat * range_lon;
        var zoomrequest = 360*180/area/10;
        var zoomnew = Math.floor(Math.log(zoomrequest+1));
        zoomnew = Math.min(9, zoomnew);
        zoomnew = Math.max(1, zoomnew);
        return zoomnew;
    }

    var get_tile_filenames = function(lon_min, lon_max, lat_min, lat_max) {
//        console.log(lon_min, lon_max, lat_min, lat_max);
        var tilenr_x_min = long2tile(lon_min, zoomlevel);
        var tilenr_x_max = long2tile(lon_max, zoomlevel);
        var tilenr_y_min = lat2tile(lat_min, zoomlevel);
        var tilenr_y_max = lat2tile(lat_max, zoomlevel);
        var ntilesx = Math.abs(tilenr_x_max - tilenr_x_min) + 1;
        var ntilesy = Math.abs(tilenr_y_max - tilenr_y_min) + 1;
        var ntiles = ntilesx * ntilesy;
        if (ntiles > 1000)
        {
            console.log('ERROR', 'too many tiles ' , ntiles);
            return [];
        }

        var lower_tilenrx = Math.min(tilenr_x_max, tilenr_x_min);
        var upper_tilenrx = Math.max(tilenr_x_max, tilenr_x_min);
        var lower_tilenry = Math.min(tilenr_y_max, tilenr_y_min);
        var upper_tilenry = Math.max(tilenr_y_max, tilenr_y_min);

        var tile_filenames = [];
        for (var i = lower_tilenrx; i <= upper_tilenrx; ++i) {
            for (var j = lower_tilenry; j <= upper_tilenry; ++j) {
                tile_filenames.push('tiles/' + zoomlevel + '/' + i + '/' +  j + '.geojson');
            }
        }
        return tile_filenames;
    }

    function zoom_update() {
        xyzoom = d3.behavior.zoom()
            .x(xscale)
            .y(yscale)
            .on("zoom", zoomable ? draw : null);
        xzoom = d3.behavior.zoom()
            .x(xscale)
            .on("zoom", zoomable ? draw : null);
        yzoom = d3.behavior.zoom()
            .y(yscale)
            .on("zoom", zoomable ? draw : null);

        svg.select('rect.zoom.xy.box').call(xyzoom);
        svg.select('rect.zoom.x.box').call(xzoom);
        svg.select('rect.zoom.y.box').call(yzoom);

        var xmin = Number(xscale.domain()[0])/1000;
        var xmax = Number(xscale.domain()[1])/1000;
        var ymin = yscale.domain()[0];
        var ymax = yscale.domain()[1];

        var lon_min = (xmin-offset_x)/scale_fac_x;
        var lon_max = (xmax-offset_x)/scale_fac_x;
        var lat_min = (ymin-offset_y)/scale_fac_y - 45.0;
        var lat_max = (ymax-offset_y)/scale_fac_y - 45.0;
        lon_min = Math.max(-178.0, lon_min);
        lon_max = Math.min(178.0, lon_max);
        lat_min = Math.max(-84.0, lat_min);
        lat_max = Math.min(84.0, lat_max);

        zoomlevel = calc_zoom_level(lon_min, lon_max, lat_min, lat_max);
        var tile_filenames = [];
        var tile_filenames = get_tile_filenames(lon_min, lon_max, lat_min, lat_max);

        var all_in_buffer = true;
        for (var i in tile_filenames) {
            if (tiles_current.indexOf(tile_filenames[i]) == -1) {
                all_in_buffer = false;
                break;
            }
        }

        if (!all_in_buffer || zoomlevel != zoomlevel_previous) {
            console.log('DATA UPDATE');
            zoomlevel_previous = zoomlevel;
            data_points = [];
            tiles_current = [];
            for (var i in tile_filenames) {
                var tile_filename = tile_filenames[i];
                if (tile_filename in tiles) {
                    if (tiles[tile_filename] == null) {
                        continue;
                    }
                    if (tiles[tile_filename].type == "LineString") {
                        add_line(tiles[tile_filename].coordinates);
                        tiles_current.push(tile_filename);
                    } else if (tiles[tile_filename].type == "MultiLineString") {
                        add_multi_line(tiles[tile_filename].coordinates);
                        tiles_current.push(tile_filename);
                    }
                } else {
                    load_tile(tile_filename, zoomlevel);
                }
            }
        }

        update();
        console.log("ntiles:", tile_filenames.length, "zoomlevel:", zoomlevel, "points:", data_points.length/2);
    }

    function add_line(line) {
        for (var i in line) {
            data_points.push([line[i][0]*scale_fac_x+offset_x, (line[i][1]+45)*scale_fac_y+offset_y]);
        }
    }

    function add_multi_line(line_segments) {
        for (var i in line_segments) {
            for (var j in line_segments[i]) {
                data_points.push([line_segments[i][j][0]*scale_fac_x+offset_x, (line_segments[i][j][1]+45)*scale_fac_y+offset_y]);
            }
        }
    }

    function load_tile(tile_filename, zoom_at_start) {
        d3.json(tile_filename, function(json) {
            if (!json) {
                tiles[tile_filename] = null;
                return;
            }
            console.log("FILE FOUND!", tile_filename);
            var coordinates = json.features[0].geometry.coordinates;
            var type = json.features[0].geometry.type;
            scale_fac_x = json.features[0].properties.scale_fac_x;
            offset_x = json.features[0].properties.offset_x;
            scale_fac_y = json.features[0].properties.scale_fac_y;
            offset_y = json.features[0].properties.offset_y;
            tiles[tile_filename] = json.features[0].geometry;
            if (zoomlevel != zoom_at_start) {
                return;
            }
            if (type == "LineString") {
                add_line(coordinates);
                tiles_current.push(tile_filename);
            } else if (type == "MultiLineString") {
                add_multi_line(coordinates);
                tiles_current.push(tile_filename);
            }
            update();
        });
    }

    function draw() {
        svg.select('g.x.axis').call(xaxis);
        svg.select('g.y.axis').call(yaxis);
        zoom_update();
    }

    // X value to scale
    function X(d) {
        return xscale(d.time);
    }

    // Y value to scale
    function Y(d) {
        return yscale(d[1]);
    }

    chart.zoom = function (_){
        if (!arguments.length) return zoomable;
        zoomable = _;
        return chart;
    }

    return chart;
}
