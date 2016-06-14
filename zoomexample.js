var ex_chart = example().zoom(true);

var data = [];
//    for (var i = 0; i < 100; i++) {
//        data.push([Math.random()*100, Math.random()*100]);
//    }

d3.json('out2.geojson', function(json) {
    var coordinates = json.features[0].geometry.coordinates;
    for (var i in coordinates)
    {
//            console.log(coordinates[i][0]);
        data.push([coordinates[i][0], coordinates[i][1]]);
//            data.push([0.2, 0.1]);
    }
    console.log(data);

//        data.forEach(function(d) {
////            console.log(d);
//            d.x = d[0];
//            d.y = d[1];
//        });
    d3.select('#chart')
            .append("svg").attr("width", window.innerWidth).attr("height",window.innerHeight)
            .datum(data).call(ex_chart);
});



function example() {
    var svg;
    var margin = {
        top: 60,
        bottom: 80,
        left: 60,
        right: 0
    };
    var width = 1000;
    var height = 800;
    var xaxis = d3.svg.axis();
    var yaxis = d3.svg.axis();
    var xscale = d3.scale.linear();
    var yscale = d3.scale.linear();
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
        selection.each(function(data) {
            svg = d3.select(this).selectAll('svg').data([data]);
            svg.enter().append('svg');
            var g = svg.append('g')
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            g.append("defs").append("clipPath")
                    .attr("id", "clip")
                    .append("rect")
                    .attr("width", width - margin.left - margin.right)
                    .attr("height", height - margin.top - margin.bottom);

            g.append("svg:rect")
                    .attr("class", "border")
                    .attr("width", width - margin.left - margin.right)
                    .attr("height", height - margin.top - margin.bottom)
                    .style("stroke", "black")
                    .style("fill", "none");

            g.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(" + 0 + "," + (height - margin.top - margin.bottom) + ")");

            g.append("g")
                    .attr("class", "y axis");

            g.append("g")
                    .attr("class", "scatter")
                    .attr("clip-path", "url(#clip)");

            g.append("g")
                    .attr("class", "line")
                    .attr("clip-path", "url(#clip)");

            g.append("svg:rect")
                    .attr("class", "zoom xy box")
                    .attr("width", width - margin.left - margin.right)
                    .attr("height", height - margin.top - margin.bottom)
                    .style("visibility", "hidden")
                    .attr("pointer-events", "all")
                    .call(xyzoom);

            g.append("path")
                    .attr("class", "line")
                    .attr("clip-path", "url(#clip)")
                    .attr("width", width - margin.left - margin.right)
                    .attr("height", height - margin.top - margin.bottom);

            var pathline = svg.select("path.line");
            pathline.attr("d", valueline(data));

            // Update the x-axis
            xscale.domain(d3.extent(data, function(d) { return d[0]; }));
            xscale.range([0, width - margin.left - margin.right]);

            xaxis.scale(xscale)
                    .orient('bottom')
                    .tickPadding(10);

            // Update the y-scale.
            yscale.domain(d3.extent(data, function(d) { return d[1]; }))
            yscale.range([height - margin.top - margin.bottom, 0]);

            yaxis.scale(yscale)
                    .orient('left')
                    .tickPadding(10);

            draw();
        });

        return chart;
    }


    function update() {
        var gs = svg.select("g.scatter");

        var circle = gs.selectAll("circle")
                .data(function(d) {
                    return d;
                });

        circle.enter().append("svg:circle")
                .attr("class", "points")
                .style("fill", "steelblue")
                .attr("cx", function(d) {
                    return X(d);
                })
                .attr("cy", function(d) {
                    return Y(d);
                })
                .attr("r", 4);

        circle.attr("cx", function(d) {
                    return X(d);
                })
                .attr("cy", function(d) {
                    return Y(d);
                });

        circle.exit().remove();

        var pathline = svg.select("path.line");
        pathline.attr("d", valueline(data));
        svg.select("path").attr("transform", "translate("+xyzoom.translate()+")" + " scale("+xyzoom.scale()+")");
            console.log(pathline);
    }

    function zoom_update() {
        xyzoom = d3.behavior.zoom()
                .x(xscale)
                .y(yscale)
                .on("zoom", zoomable ? draw : null);

        svg.select('rect.zoom.xy.box').call(xyzoom);
    }

    function draw() {
            console.log('draw');
        svg.select('g.x.axis').call(xaxis);
        svg.select('g.y.axis').call(yaxis);

        zoom_update();
        update();
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