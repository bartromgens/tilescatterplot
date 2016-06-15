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
var height = Math.min(plot_width - margin.top - margin.bottom, 600);
var plot_height = height + margin.top + margin.bottom;

var ex_chart = example().zoom(true);

var data = [];
var hasTile = true;
var tiles = {};

var filename = 'out.geojson';
//filename = 'tiles/6/16/34.geojson';
d3.json(filename, function(json) {
    var coordinates = json.features[0].geometry.coordinates;
    for (var i in coordinates)
    {
        data.push([coordinates[i][1], coordinates[i][0]]);
    }

    d3.select('#chart')
            .append("svg").attr("width", window.innerWidth).attr("height",window.innerHeight)
            .datum(data).call(ex_chart);
});


function long2tile(lon, zoom) {
    return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
}

function lat2tile(lat, zoom) {
    return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
}


function example() {
    var svg;
//    var margin = {
//        top: 60,
//        bottom: 80,
//        left: 60,
//        right: 0
//    };
//    var width = 1000;
//    var height = 800;
    var xaxis = d3.svg.axis();
    var yaxis = d3.svg.axis();
    var xscale = d3.scale.linear();
    var yscale = d3.scale.linear();
//    var yscale = d3.scale.log()
//        .base(10)
//        .domain([Math.exp(0), Math.exp(10)]);
    var zoomable = true;

    var xyzoom = d3.behavior.zoom()
            .x(xscale)
            .y(yscale)
            .on("zoom", zoomable ? draw : null);

    // Define the line
    var valueline = d3.svg.line()
            .x(function(d) { return X(d); })
            .y(function(d) { return Y(d); });

    function chart(selection) {
        console.log('create chart');
        console.log(selection);
        selection.each(function(data) {
            svg = d3.select(this).selectAll('svg').data([data]);
            svg.enter().append('svg');
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

            g.append("svg:rect")
                    .attr("class", "zoom xy box")
                    .attr("width", plot_width - margin.left - margin.right)
                    .attr("height", plot_height - margin.top - margin.bottom)
                    .style("visibility", "hidden")
                    .attr("pointer-events", "all");

//            var pathline = svg.select("path.line");
//            pathline.attr("d", valueline(data));

            // Update the x-axis
            xscale.domain(d3.extent(data, function(d) { return d[1]; }));
            xscale.range([0, plot_width - margin.left - margin.right]);

            xaxis.scale(xscale)
                    .orient('bottom')
                    .tickPadding(10);

            // Update the y-scale.
            yscale.domain(d3.extent(data, function(d) { return d[0]; }))
            yscale.range([plot_height - margin.top - margin.bottom, 0]);

            yaxis.scale(yscale)
                    .orient('left')
                    .tickPadding(10);

            draw();
        });

        return chart;
    }

    function update() {
//        console.log('update begin');
        var gs = svg.select("g.scatter");
        var circle = gs.selectAll("circle");

//        update_path();
        update_circles(circle);
//        console.log('update end');
    }

    function update_path() {
        var pathline = svg.select("path.line");
        pathline.attr("d", valueline(data));
    }

    function update_circles(circle) {
        circle = circle = circle.data(data, function(d) { return d; });
        circle.enter().append("svg:circle")
            .attr("class", "marker")
            .attr("cx", function(d) {return X(d);})
            .attr("cy", function(d) {return Y(d);})
            .attr("r", 2);

        circle.attr("cx", function(d) { return X(d); })
              .attr("cy", function(d) { return Y(d); });

        circle.exit().remove();
    }

    var zoomlevel = 1;

    function zoom_update() {
        var xmin = Math.max(-178.0, xscale.domain()[0]);
        var xmax = Math.min(178.0, xscale.domain()[1]);
        var ymin = Math.max(-84.0, yscale.domain()[0]);
        var ymax = Math.min(84.0, yscale.domain()[1]);
//        console.log(ymin + ", " + ymax);
//        console.log(xmin + ", " + xmax);
//        console.log("tilenr_x_min: " + tilenr_x_min);
//        console.log("tilenr_x_max: " + tilenr_x_max);
//        console.log("ymax", ymax);
//        console.log("tilenr_y_min: " + tilenr_y_min);
//        console.log("tilenr_y_max: " + tilenr_y_max);
//        console.log("ntilesy:", ntilesy);
//        console.log("ntilesx:", ntilesx);
        var rangex = Math.abs(xmax-xmin);
        var rangey = Math.abs(ymax-ymin);
        var area = rangex * rangey;
//        zoomlevel = Math.min(8, Math.floor(Math.log(36/(xmax-xmin)+1, 20)*4));
        var zoomrequest = 360*180/area/20;
//        var zoomrequest = 360/rangex;
//        console.log(zoomrequest);
        zoomlevel = Math.floor(Math.log(zoomrequest+1));
        zoomlevel = Math.min(9, zoomlevel);
        zoomlevel = Math.max(1, zoomlevel);

        var tilenr_x_min = long2tile(xmin, zoomlevel);
        var tilenr_x_max = long2tile(xmax, zoomlevel);
        var tilenr_y_min = lat2tile(ymin, zoomlevel);
        var tilenr_y_max = lat2tile(ymax, zoomlevel);
        var ntilesx = Math.abs(tilenr_x_max - tilenr_x_min) + 1;
        var ntilesy = Math.abs(tilenr_y_max - tilenr_y_min) + 1;
        var ntiles = ntilesx * ntilesy;
//        if (ntiles > 12 && zoomlevel > 1) {
//            zoomlevel = zoomlevel - 1;
//        }
//        if (ntiles < 4) {
//            zoomlevel = zoomlevel + 1;
//        }
//        if (data.length > 5000) {
//            zoomlevel = zoomlevel - 1;
//        }
        var lower_tilenrx = Math.min(tilenr_x_max, tilenr_x_min);
        var upper_tilenrx = Math.max(tilenr_x_max, tilenr_x_min);
        var lower_tilenry = Math.min(tilenr_y_max, tilenr_y_min);
        var upper_tilenry = Math.max(tilenr_y_max, tilenr_y_min);
//        console.log("x", lower_tilenrx, upper_tilenrx);
//        console.log("y", lower_tilenry, upper_tilenry);
        for (var i = lower_tilenrx; i <= upper_tilenrx; ++i) {
            for (var j = lower_tilenry; j <= upper_tilenry; ++j) {
                var tile_filename = 'tiles/' + zoomlevel + '/' + i + '/' +  j + '.geojson';
                if (tile_filename in tiles) {
                    if (tiles[tile_filename] == null) {
                        continue;
                    }
                    if (tiles[tile_filename].type == "LineString") {
                        add_line(tiles[tile_filename].coordinates);
                    } else if (tiles[tile_filename].type == "MultiLineString") {
                        add_multi_line(tiles[tile_filename].coordinates);
                    }
                } else {
                    load_tile(tile_filename, zoomlevel);
                }
            }
        }

        console.log("ntiles:", ntiles, "zoomlevel:", zoomlevel, "points:", data.length/2);
        xyzoom = d3.behavior.zoom()
            .x(xscale)
            .y(yscale)
            .on("zoom", zoomable ? draw : null);
        svg.select('rect.zoom.xy.box').call(xyzoom);
        update();
    }

    function add_line(line) {
        for (var i in line) {
            data.push([line[i][1], line[i][0]]);
        }
    }

    function add_multi_line(line_segments) {
        for (var i in line_segments) {
            for (var j in line_segments[i]) {
                data.push([line_segments[i][j][1], line_segments[i][j][0]]);
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
            tiles[tile_filename] = json.features[0].geometry;
            if (zoomlevel != zoom_at_start) {
                return;
            }
            if (type == "LineString") {
                add_line(coordinates);
            } else if (type == "MultiLineString") {
                add_multi_line(coordinates);
            }
            update();
        });
    }

    function draw() {
//        console.log('draw');
        data = [];
        svg.select('g.x.axis').call(xaxis);
        svg.select('g.y.axis').call(yaxis);
        zoom_update();
//        console.log('points', data.length);
//        update();
//        svg.attr("transform", "translate(" + xyzoom.translate() + ")scale(" + xyzoom.scale() + ")");
    }

    // X value to scale
    function X(d) {
        return xscale(d[1]);
    }

    // Y value to scale
    function Y(d) {
        return yscale(d[0]);
    }

    chart.zoom = function (_){
        if (!arguments.length) return zoomable;
        zoomable = _;
        return chart;
    }

    return chart;
}