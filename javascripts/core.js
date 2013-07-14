function addNavigation() {
    d3.select('#navigation').selectAll('div')
        .data(WorldData)
        .enter().append('li')
        .html(function(d, i) { return i === 0 ? 'Start' : i; })
        .on('click', function(d, i) {
            showStep(i);
        })
}

function setNav(index) {
    d3.select('#navigation').selectAll('li')
        .classed('active', false)
        .filter(':nth-child('+ (index+1) +')').classed('active', true);
}

// show step based on diagram state.
function showStep(index) {
    // stay in bounds
    if (index < 0) index = WorldData.length-1;
    if (index > WorldData.length-1) index = 0;

    // click start on initial starting position
    if(index === 0 && !inView)
        viewIn().each('end', function(){ 
            _showStep(1)
        })
    // click a step on initial start.
    else if(index > 0 && !inView)
        viewIn().each('end', function(){
            _showStep(index)
        });
    // click start when in process (start over)
    else if(index === 0 && inView) {
        _showStep(0);
        viewOut();
    }
    // click a step when in process
    else
        _showStep(index);
}

// Internal. Prgramatically show the step.
function _showStep(index) {
    WorldData[index].x0 = height/2;
    WorldData[index].y0 = 0;
    
    update(WorldData[0], WorldData[index]);
    setNav(index);
    _step = index;
}

function viewIn(){
    inView = true;
    internet.selectAll('text')
        .transition()
        .duration(1000)
        .attr("transform", "translate(70, 0)")

    return  world.transition()
            .duration(1000)
            .attr("transform", "translate("+ (-(width/2)) +", 0)")
}
function viewOut() {
    inView = false;
    internet.selectAll('text')
        .transition()
        .duration(1000)
        .attr("transform", "translate(0, 0)")

    return  world.transition()
            .duration(1000)
            .attr("transform", "translate(0, 0)")
}

function showPage(name) {
    d3.html("/pages/" + name + ".html?" + Math.random(), function(rsp) {
        if(rsp) {
            description.selectAll('div').remove();
            description.append("div")[0][0].appendChild(rsp);
        }
        else {
            console.log('error loading page name:' + name)
        }
    })
}

var xold, yold;
function showActive(active) {
    var derp = vis.selectAll('g.active')
        .data(active, function(d) { return d.name })

    var derpEnter = derp.enter().append('svg:g')
        .attr('class', 'active')
        .attr("transform", function(d) {
            return "translate(" + (yold || d.y) + "," + (xold || d.x) + ")"
        })

    var derpUpdate = derp.transition()
        .duration(500)
        .attr("transform", function(d) { 
            return "translate(" + d.y + "," + d.x + ")";
        })

    derpEnter.append("line")
        .attr("x1", -20)
        .attr("x2", -100)
        .attr("y1", 30)
        .attr("y2", 120)
        .attr("stroke-dasharray", "3, 3")
    derpEnter.append('path')
        .attr("transform", "translate(-20,30) rotate(40 0 0)")
        .attr('d', d3.svg.symbol().type('triangle-up').size(180))
        .attr('fill', '#333')

    derp.exit().remove();

    if (active[0]) {
        xold = active[0].x;
        yold = active[0].y;
    }
}

function update(root, data) {
    var duration = d3.event && d3.event.altKey ? 5000 : 500;

    // Compute the new tree layout.
    var nodes = tree.nodes(data).reverse();
    var active = [];
    // Normalize for fixed-depth.
    nodes.forEach(function(d) { 
        d.y = d.depth * 180;
        if (d.active) active.push(d);
    });

    showActive(active);

    showPage(nodes[nodes.length-1].page);

    // Update the nodes
    var node = vis.selectAll("g.node")
        .data(nodes, function(d) { return d.name });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("svg:g")
        .attr('class', function(d){ return 'node ' + d.type + ' ' + d.name })
        .attr("transform", function(d) { return "translate(" + root.y0 + "," + root.x0 + ")"; })



    drawWebsite(vis.selectAll('g.website'));

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
        .style("fill", 'lightsteelblue')


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
        .attr("transform", "translate(" + 900 + "," + 0 + ")")

    var node = DB.selectAll("g.db")
        .data([Database], function(d) { return d.name });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("svg:g")
        .attr('class', function(d){ 
            return 'db ' + d.type
        })
        .attr("transform", function(d) { 
            return "translate(" + Database.y + "," + Database.x + ")";
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
        //.attr('transform', "translate(50,0)")
        .attr('class', 'rect')
        //.attr('x', 30)
        .attr("height", 30)
        .attr("width", 24)
}

function drawWebsite(nodes) {
    return nodes
        .append("svg:rect")
        //.attr('transform', "translate(50,0)")
        .attr('class', 'rect')
        .attr("height", 30)
        .attr("width", 24)
}

function drawLabels(nodes) {
    return nodes
        .append("svg:text")
        // .attr("x", function(d) { 
        //     return d.children || d._children ? -10 : 10;
        // })
        .attr("dy", "-1em")
        .attr("text-anchor", function(d) { 
            return "start";
        })
        .text(function(d) { return d.name; })
        .style("fill-opacity", 1e-6);
}



var height = 600;

var world = d3.select("#world").append("svg:svg")
    .attr("width", '100%')
    .attr("height", height)
    .style('border', '1px solid')
    .style('background-color', "#FFF")
    .style('margin-top', '48px')
    .append("svg:g")
        .attr("transform", "translate(" + 0 + "," + 0 + ")")

// world.append('svg:rect')
//     .attr("height", '100%')
//     .attr("width", '100%')
//     .style("fill", '#eee')

var width = d3.select('svg').node().clientWidth;

var vis = world.append("svg:svg")
    .attr('class', 'server-diagram')
    .attr('x', width/2)
    .attr('y', 0)
    .attr('transform', "translate(50, 0)")


var description = d3.select("#description")
    .style("height", height + 'px')


// internet line
var internet = world.append('svg:g').attr('class', 'internet');
internet.append("line")
    .attr("x1", '50%')
    .attr("x2", '50%')
    .attr("y1", '100%')

internet.append('svg:text')
    .text("Public Internet")
    .attr('class', 'background')
    .attr('x', '50%')
    .attr('text-anchor', 'middle')
    .attr('dy', '1.5em')

internet.append('svg:text')
    .text("Public Internet")
    .attr('class', 'foreground')
    .attr('x', '50%')
    .attr('text-anchor', 'middle')
    .attr('dy', '1.5em')

// client
function client() {
    var client = world.append('svg:svg')
        .attr('x', "50%")
        .attr('y', "50%")
        .attr('class', 'client')
    client.append('svg:rect')
        .attr('transform', "translate(-74,0)")
        .attr("height", 30)
        .attr("width", 24)
        .style("fill", 'red');
    client.append('svg:text')
        .attr('transform', "translate(-80,-2)")
        .text("Client")
        .style('font-size', 14)
        .attr('text-anchor', 'end')
        .attr('dy', '1.5em')
}
client();

//---------------------------------------------------


var tree = d3.layout.tree().size([height, width]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

var WorldData;
var Database;
var inView = false;
var _step = 0;

startServer()
function startServer() {
    d3.json("/data/world.json?" + Math.random(), function(data) {

        WorldData = data.world;
        WorldData[0].x0 = height / 2;
        WorldData[0].y0 = 0;

        Database = data.database;
        Database.x = height / 2;
        Database.y = 900;
        Database.x0 = Database.x;
        Database.y0 = Database.y;


        update(WorldData[0], WorldData[0]);
        addNavigation();
    })
}

d3.select("body")
    .on("keydown", function(){
        if(d3.event.keyCode === 39) // right arrow
            showStep(_step+1);
        else if(d3.event.keyCode === 37) // left arrow
            showStep(_step-1)
    })
