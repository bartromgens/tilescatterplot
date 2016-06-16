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
var tiles_current = [];

var scale_fac_y = 1.0;
var offset_y = 1.0;

var filename = 'out.geojson';
//filename = 'tiles/6/16/34.geojson';
d3.json(filename, function(json) {
    var coordinates = json.features[0].geometry.coordinates;
    scale_fac_y = json.features[0].properties.scale_fac_y;
    offset_y = json.features[0].properties.offset_y;
    for (var i in coordinates)
    {
        data.push([coordinates[i][0], (coordinates[i][1]+45)*scale_fac_y+offset_y]);
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
    var yscale = d3.scale.log()
        .base(10)
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
            xscale.domain(d3.extent(data, function(d) { return d[0]; }));
            xscale.range([0, plot_width - margin.left - margin.right]);

            xaxis.scale(xscale)
                    .orient('bottom')
                    .tickPadding(10);

            // Update the y-scale.
            yscale.domain(d3.extent(data, function(d) { return d[1]; }))
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

    var zoomlevel = 0;
    var zoomlevel_previous = zoomlevel;

    function zoom_update() {
        xyzoom = d3.behavior.zoom()
            .x(xscale)
            .y(yscale)
            .on("zoom", zoomable ? draw : null);
        svg.select('rect.zoom.xy.box').call(xyzoom);

        var xmin = xscale.domain()[0];
        var xmax = xscale.domain()[1];
        var ymin = yscale.domain()[0];
        var ymax = yscale.domain()[1];
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
        zoomlevel = Math.max(0, zoomlevel);

        var lon_min = Math.max(-178.0, xmin);
        var lon_max = Math.min(178.0, xmax);
        var lat_min = (ymin-offset_y)/scale_fac_y - 45.0;
        var lat_max = (ymax-offset_y)/scale_fac_y - 45.0;
        lat_min = Math.max(-84.0, lat_min);
        lat_max = Math.min(84.0, lat_max);
//        console.log(lat_min, lat_max);

        var tilenr_x_min = long2tile(lon_min, zoomlevel);
        var tilenr_x_max = long2tile(lon_max, zoomlevel);
        var tilenr_y_min = lat2tile(lat_min, zoomlevel);
        var tilenr_y_max = lat2tile(lat_max, zoomlevel);
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
        var tile_filenames = [];
        for (var i = lower_tilenrx; i <= upper_tilenrx; ++i) {
            for (var j = lower_tilenry; j <= upper_tilenry; ++j) {
                tile_filenames.push('tiles/' + zoomlevel + '/' + i + '/' +  j + '.geojson');
            }
        }

        var all_in_buffer = true;
        for (var i in tile_filenames) {
            if (tiles_current.indexOf(tile_filenames[i]) == -1) {
                console.log(tile_filenames[i], 'is new in buffer')
                all_in_buffer = false;
                break;
            }
        }
        if (!all_in_buffer || zoomlevel != zoomlevel_previous) {
            console.log('DATA UPDATE');
            zoomlevel_previous = zoomlevel;
            data = [];
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
        console.log("ntiles:", ntiles, "zoomlevel:", zoomlevel, "points:", data.length/2);
    }

    function add_line(line) {
        for (var i in line) {
            data.push([line[i][0], (line[i][1]+45)*scale_fac_y+offset_y]);
        }
    }

    function add_multi_line(line_segments) {
        for (var i in line_segments) {
            for (var j in line_segments[i]) {
                data.push([line_segments[i][j][0], (line_segments[i][j][1]+45)*scale_fac_y+offset_y]);
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
//        console.log('draw');
        svg.select('g.x.axis').call(xaxis);
        svg.select('g.y.axis').call(yaxis);
        zoom_update();
//        console.log('points', data.length);
//        update();
//        svg.attr("transform", "translate(" + xyzoom.translate() + ")scale(" + xyzoom.scale() + ")");
    }

    // X value to scale
    function X(d) {
        return xscale(d[0]);
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