var Draw = {
    software : function(nodes) {
        return nodes
            .append("svg:circle")
            .attr("r", 1e-6)
            .style("fill", 'lightsteelblue');
    }

    ,servers : function(nodes) {
        return nodes
            .append("svg:rect")
            .attr('class', 'rect')
            .attr("height", 30)
            .attr("width", 24)
    }

    ,website : function(nodes) {
        return nodes
            .append("svg:rect")
            .attr('class', 'rect')
            .attr("height", 30)
            .attr("width", 24)
    }

    ,labels : function(nodes) {
        return nodes
            .append("svg:text")
            .attr("dy", "-1em")
            .attr("text-anchor", function(d) { 
                return "start";
            })
            .text(function(d) { return d.name; })
            .style("fill-opacity", 1e-6);
    }
}

var Render = {
    internet : function(container) {
        var node = container.append('svg:g').attr('class', 'internet');
        node.append("line")
            .attr("x1", '50%')
            .attr("x2", '50%')
            .attr("y1", '100%')
        node.append('svg:text')
            .text("Public Internet")
            .attr('class', 'background')
            .attr('x', '50%')
            .attr('text-anchor', 'middle')
            .attr('dy', '1.5em')
        node.append('svg:text')
            .text("Public Internet")
            .attr('class', 'foreground')
            .attr('x', '50%')
            .attr('text-anchor', 'middle')
            .attr('dy', '1.5em')

        return node;
    }

    ,client : function(container) {
        var node = container.append('svg:svg')
            .attr('x', "50%")
            .attr('y', "50%")
            .attr('class', 'client')
        node.append('svg:rect')
            .attr('transform', "translate(-74,0)")
            .attr("height", 30)
            .attr("width", 24)
            .style("fill", 'red');
        node.append('svg:text')
            .attr('transform', "translate(-80,-2)")
            .text("Client")
            .style('font-size', 14)
            .attr('text-anchor', 'end')
            .attr('dy', '1.5em')

        return node;
    }
}

function addNavigation() {
    d3.select('#navigation').selectAll('div')
        .data(World.data)
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
    if (index < 0) index = World.data.length-1;
    if (index > World.data.length-1) index = 0;

    // click start on initial starting position
    if(index === 0 && !World.isServerDiagraminView)
        viewIn().each('end', function(){ 
            _showStep(1)
        })
    // click a step on initial start.
    else if(index > 0 && !World.isServerDiagraminView)
        viewIn().each('end', function(){
            _showStep(index)
        });
    // click start when in process (start over)
    else if(index === 0 && World.isServerDiagraminView) {
        _showStep(0);
        viewOut();
    }
    // click a step when in process
    else
        _showStep(index);
}

// Internal. Prgramatically show the step.
function _showStep(index) {
    World.data[index].x0 = World.height/2;
    World.data[index].y0 = 0;
    
    update(World.data[0], World.data[index]);
    setNav(index);
    World.step = index;
}

function viewIn(){
    World.isServerDiagraminView = true;
    World.internet.selectAll('text')
        .transition()
        .duration(1000)
        .attr("transform", "translate(70, 0)")

    return  World.container.transition()
            .duration(1000)
            .attr("transform", "translate("+ (-(World.width/2)) +", 0)")
}
function viewOut() {
    World.isServerDiagraminView = false;
    World.internet.selectAll('text')
        .transition()
        .duration(1000)
        .attr("transform", "translate(0, 0)")

    return  World.container.transition()
            .duration(1000)
            .attr("transform", "translate(0, 0)")
}

function showPage(name) {
    d3.html("/pages/" + name + ".html?" + Math.random(), function(rsp) {
        if(rsp) {
            World.description.selectAll('div').remove();
            World.description.append("div")[0][0].appendChild(rsp);
        }
        else {
            console.log('error loading page name:' + name)
        }
    })
}

var xold, yold;
function showActive(active) {
    var derp = World.serverDiagram.selectAll('g.active')
        .data(active, function(d) { return d.name })

    var derpEnter = derp.enter().append('svg:g')
        .attr('class', 'active')
        .attr("transform", function(d) {
            return "translate(" + (yold || d.y) + "," + (xold || d.x) + ")"
        })

    var derpUpdate = derp.transition()
        .duration(World.duration)
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
    // Compute the new tree layout.
    var nodes = World.tree.nodes(data).reverse();
    var active = [];
    // Normalize for fixed-depth.
    nodes.forEach(function(d) { 
        d.y = d.depth * 180;
        if (d.active) active.push(d);
    });

    showPage(nodes[nodes.length-1].page);

    // Update the nodes
    var node = World.serverDiagram.selectAll("g.node")
        .data(nodes, function(d) { return d.name });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("svg:g")
        .attr('class', function(d){ return 'node ' + d.type + ' ' + d.name })
        .attr("transform", function(d) { return "translate(" + root.y0 + "," + root.x0 + ")"; })

    World.serverDiagram.selectAll('g.website').call(Draw.website);
    World.serverDiagram.selectAll('g.software').call(Draw.software);
    World.serverDiagram.selectAll('g.server').call(Draw.servers);
    nodeEnter.call(Draw.labels);

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(World.duration)
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
        .duration(World.duration)
        .style("fill-opacity", 0)
        .remove();

    nodeExit.select("circle").attr("r", 1e-6);
    nodeExit.select("text").style("fill-opacity", 1e-6);




    // LINKING DATA
    var linkData = World.tree.links(nodes);


    // add database links if needed
    var hasDb = false;
    nodeUpdate.each(function(d) {
        if(d.connectToDB) { hasDb = true; return }
    })

    if(hasDb) {
        updateDatabase([World.databaseData]);

        // hack to point to the db if no other active
        if(active.length === 0)
            active.push(World.databaseData)

        nodeUpdate.filter(function(d) { return !!d.connectToDB; })
            .each(function(d) {
                linkData.push({
                    source: d,
                    target: World.serverDiagram.selectAll("g.db").datum()
                })
            })
    } 
    else
        updateDatabase([])


    // Update the links…
    var link = World.serverDiagram.selectAll("path.link")
        //.data(linkData)
        .data(linkData, function(d) { return d.source.name + '.' + d.target.name; });

    // Enter any new links at the parent's previous position.
    link.enter().insert("svg:path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
            var o = {x: root.x0, y: root.y0};
            return World.diagonal({source: o, target: o});
        })
        .transition()
            .duration(World.duration)
            .attr("d", World.diagonal);

    // Transition links to their new position.
    link.transition()
        .duration(World.duration)
        .attr("d", World.diagonal);


    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        .duration(World.duration)
        .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });

    showActive(active);
}

function updateDatabase(data) {
    var node = World.databaseDiagram.selectAll("g.db")
        .data(data, function(d) { return d.name });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("svg:g")
        .attr('class', function(d){ 
            return 'db ' + d.type
        })
        .attr("transform", function(d) { 
            return "translate(" + d.y + "," + d.x + ")";
        })

    World.databaseDiagram.selectAll('g.server').call(Draw.servers);
    nodeEnter.call(Draw.labels);

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(World.duration)
        .attr("transform", function(d) { 
            return "translate(" + 0 + "," + d.x + ")";
        });

    nodeUpdate.select("text")
        .attr('dx', 5)
        .style("fill-opacity", 1);

    node.exit().transition()
        .duration(World.duration)
        .style("fill-opacity", 0)
        .remove();
}

//---------------------------------------------------
// Initialize application

var World = {
    height : 600
    ,step : 0
    ,isServerDiagraminView : false
    ,duration : 500
    ,diagonal : d3.svg.diagonal()
                    .projection(function(d) { return [d.y, d.x]; })

}

World.container = d3.select("#world").append("svg:svg")
    .attr("width", '100%')
    .attr("height", World.height)
    .style('border', '1px solid')
    .style('background-color', "#FFF")
    .style('margin-top', '48px')
    .append("svg:g")
        .attr("transform", "translate(" + 0 + "," + 0 + ")")

World.width = d3.select('svg').node().clientWidth;

World.tree = d3.layout.tree().size([World.height, World.width]);

World.serverDiagram = World.container.append("svg:svg")
                        .attr('class', 'server-diagram')
                        .attr('x', World.width/2)
                        .attr('y', 0)
                        .attr('transform', "translate(50, 0)")

World.description = d3.select("#description")
                        .style("height", World.height + 'px')

World.databaseDiagram = World.serverDiagram.append('svg:g')
                        .attr('class', 'database-diagram')
                        .attr("transform", "translate(" + 900 + "," + 0 + ")")

World.internet = Render.internet(World.container);

World.client = Render.client(World.container);

function startServer() {
    d3.json("/data/world.json?" + Math.random(), function(data) {

        World.data = data.world;
        World.data[0].x0 = World.height / 2;
        World.data[0].y0 = 0;

        World.databaseData = data.database;
        World.databaseData.x = World.height / 2;
        World.databaseData.y = 900;
        World.databaseData.x0 = World.databaseData.x;
        World.databaseData.y0 = World.databaseData.y;

        update(World.data[0], World.data[0]);
        addNavigation();
    })
}

startServer();

d3.select("body")
    .on("keydown", function(){
        if(d3.event.keyCode === 39) // right arrow
            showStep(World.step+1);
        else if(d3.event.keyCode === 37) // left arrow
            showStep(World.step-1)
    })
