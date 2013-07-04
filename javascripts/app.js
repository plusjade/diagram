
var m = [20, 120, 20, 120],
    w = 1280 - m[1] - m[3],
    h = 600 - m[0] - m[2],
    i = 0;

var tree = d3.layout.tree().size([h, w]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

var vis = d3.select("#body").append("svg:svg")
    .attr("width", '100%')
    .attr("height", h + m[0] + m[2])
    .style('border', '1px solid')
    .append("svg:g")
        .attr("transform", "translate(" + m[3] + "," + m[0] + ")");


vis
  .append("line")
   .attr("x1", 0)
   .attr("y1", h)
   .style("stroke", "black");


var start;
var database;
d3.json("database.json", function(json) {  
    database = json;
    database.x = h / 2;
    database.y = 1000;
    database.x0 = database.x;
    database.y0 = database.y;

    d3.json("1.json", function(json) {
        start = json;
        start.x0 = h / 2;
        start.y0 = 0;

        addNavigation();
        update(start, start);
    })
})


function query(name) {
    d3.json(name + ".json", function(json) { 
        var data = json;
        data.x0 = h / 2;
        data.y0 = 0;
        update(start, data)
    })
}


function update(root, data) {
    var duration = d3.event && d3.event.altKey ? 5000 : 500;
    
    var description = vis.selectAll("g.description")
        .data([data], function(d){ console.log('desc.' + d.name) ; return 'desc.' + d.name })

    description.enter()
        .append("svg:g")
        .attr('class', 'description')
        .append("svg:text")
            .text(function(d) { return d.description })
            .attr('x', 10)
            .style('fill-opacity', 0)
            .transition()
                .duration(duration)
                .style('fill-opacity', 1)

    description.exit().remove()



    // Compute the new tree layout.
    var nodes = tree.nodes(data).reverse();
    // Normalize for fixed-depth.
    nodes.forEach(function(d) { d.y = d.depth * 180; });

    var test = []; nodes.forEach(function(d){ test.push(d.name) }); console.log(test);


    // Update the nodes…
    var node = vis.selectAll("g.node")
        .data(nodes, function(d) { return d.name });


    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("svg:g")
        .attr('class', function(d){ return 'node ' + d.type + ' ' + d.name })
        .attr("transform", function(d) { return "translate(" + root.y0 + "," + root.x0 + ")"; })
        .on("click", function(d) { query(d.name); });

    drawSoftware(vis.selectAll('g.software'));

    drawServers(vis.selectAll('g.server'))    

    drawLabels(nodeEnter);

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(duration)
        .attr("transform", function(d) { 
            return "translate(" + d.y + "," + d.x + ")";
        });

    nodeUpdate.select("circle")
        .attr("r", 10)
        .style("fill", 'lightsteelblue');

    nodeUpdate.select("text")
        .attr('dx', function(d) {
            return d.children || d._children ? -5 : 5;
        })
        .style("fill-opacity", 1);


    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
        .duration(duration)
        .style("fill-opacity", 0)
        .remove();

    nodeExit.select("circle").attr("r", 1e-6);
    nodeExit.select("text").style("fill-opacity", 1e-6);




    // LINKING DATA
    var linkData = tree.links(nodes);

    // add database links
    nodeUpdate.each(function(source) {
        if(source.connectToDB) {
            addDB().select(function(target) {
                linkData.push({
                    source: source,
                    target: target
                })
            })
        }
    })


    // Update the links…
    var link = vis.selectAll("path.link")
        //.data(linkData)
        .data(linkData, function(d) { return d.source.name + '.' + d.target.name; });

    // Enter any new links at the parent's previous position.
    link.enter().insert("svg:path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
            var o = {x: root.x0, y: root.y0};
            return diagonal({source: o, target: o});
        })
        .transition()
            .duration(duration)
            .attr("d", diagonal);

    // Transition links to their new position.
    link.transition()
        .duration(duration)
        .attr("d", diagonal);


    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        .duration(duration)
        .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}


function addDB() {
    // hack to only allow one database node.
    if(vis.selectAll("g.db").size() > 0) return vis.selectAll("g.db");

    var duration = d3.event && d3.event.altKey ? 5000 : 500;
    var DB = vis.append('svg:g')
        .attr("transform", "translate(" + 1000 + "," + 0 + ")")

    var node = DB.selectAll("g.db")
        .data([database], function(d) { return d.name });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("svg:g")
        .attr('class', function(d){ 
            return 'db ' + d.type
        })
        .attr("transform", function(d) { 
            return "translate(" + database.y + "," + database.x + ")";
        })

    drawServers(DB.selectAll('g.server'));

    drawLabels(nodeEnter);


    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(duration)
        .attr("transform", function(d) { 
            return "translate(" + 0 + "," + d.x + ")";
        });


    nodeUpdate.select("text")
        .attr('dx', function(d) {
            return d.children || d._children ? -5 : 5;
        })
        .style("fill-opacity", 1);

    return vis.selectAll("g.db");
}

function drawSoftware(nodes){
    return nodes
        .append("svg:circle")
        .attr("r", 1e-6)
        .style("fill", 'lightsteelblue');
}

function drawServers(nodes) {
    return nodes
        .append("svg:rect")
        .attr('class', 'rect')
        .attr('y', -15)
        .attr('x', -10)
        .attr("height", 30)
        .attr("width", 24)
        .style("fill", 'orange');
}

function drawLabels(nodes) {
    return nodes
        .append("svg:text")
        .attr("x", function(d) { 
            return d.children || d._children ? -10 : 10;
        })
        .attr("dy", "-1em")
        .attr("text-anchor", function(d) { 
            return d.children || d._children ? "end" : "start";
        })
        .text(function(d) { return d.name; })
        .style("fill-opacity", 1e-6);
}

function drawDescriptions(nodes) {
    return nodes
    .append("svg:text")
        .attr('class', 'description')
        .text(function(d) { return d.description })
        .attr('x', 10)
        .style('fill-opacity', 1)

}