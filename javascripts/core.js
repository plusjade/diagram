var Style = {
    software : function(nodes) {
        return nodes
            .append("svg:circle")
            //.attr("r", '2em')
            .style("fill", 'lightsteelblue');
    }
    ,
    server : function(nodes) {
        return nodes
            .append("svg:rect")
            .attr('class', 'rect')
            .attr("height", 40)
            .attr("width", 34)
    }
    ,
    internet : function(nodes) {
        return nodes.append('svg:g').attr('class', '_internet')
            .append('path')
            .attr('d', d3.svg.symbol().type('cross').size(400))
            .style("fill", '#680148');
    }
    ,
    website : function(nodes) {
        return nodes
            .append("svg:rect")
            .attr('class', 'rect')
            .attr("height", 30)
            .attr("width", 24)
    }
    ,
    'web-browser' : function(nodes) {
        return nodes
            .append('path')
            .attr('d', d3.svg.symbol().type('diamond').size(600))
            .style("fill", '#0B486B');
    }
    ,
    labels : function(nodes) {
        return nodes
            .append("svg:text")
            .attr("dy", "-1em")
            .attr("text-anchor", function(d) { 
                return "middle";
            })
            .text(function(d) { return d.name })
            .style("fill-opacity", 1e-6);
    }
}

var Navigation = {
    current : 0

    , node : d3.select('#navigation')

    , render : function() {
        var self = this;
        self.node.selectAll('div')
            .data(World.data)
            .enter().append('li')
            .html(function(d, i) { return i === 0 ? 'Start' : i; })
            .on('click', function(d, i) {
                self.navigate(i);
            })
    }

    , navigate : function(index) {
        var self = this;
        // stay in bounds
        if (index < 0) index = World.data.length-1;
        if (index > World.data.length-1) index = 0;

        self._navigate(index);
    }

    // Internal. Prgramatically navigate to step at index.
    , _navigate : function(index) {
        update(World.data[index]);
        this.highlight(index);
        this.current = index;
    }

    , next : function() {
        this.navigate(this.current+1);
    }

    , previous : function() {
        this.navigate(this.current-1);
    }

    , highlight : function(index) {
        this.node.selectAll('li')
            .classed('active', false)
            .filter(':nth-child('+ (index+1) +')').classed('active', true);
    }
}

var Parse = {
    stepDataFormat : function(data) {
        var self = this;
        return data.map(function(node) {
            return self.processSteps(node, 0);
        })
    }
    ,
    processSteps : function(node, depth) {
        var self = this;
        var steps = self.expandItems(node.step);

        // Recursively evaulate any branches with sub-steps.
        steps.forEach(function(sub) {
            sub.depth = depth;

            if(!sub.branch) return;

            sub.branch.forEach(function(b) {
                b.step = self.processSteps(b, depth+1);
            })
        })

        return steps;
    }
    ,
    expandItems : function(data) {
        var self = this;
        var output = [];
        data.forEach(function(node) {
            var d = {};
            for(attribute in self.items[node.item]) {
                d[attribute] = self.items[node.item][attribute]
            }
            for(attribute in node) {
                d[attribute] = node[attribute];
            }

            output.push(d);
        })

        return output;
    }
}

function showPage(name) {
    World.description.selectAll('div').html('<strong>Loading...</strong>');

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
            return "translate(" + (xold || d.x) + "," + (yold || d.y) + ")"
        })

    var derpUpdate = derp.transition()
        .duration(World.duration)
        .attr("transform", function(d) { 
            return "translate(" + d.x + "," + d.y + ")";
        })

    derpEnter.append("line")
        .attr("x1", -20)
        .attr("x2", -100)
        .attr("y1", 30)
        .attr("y2", 120)
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

var Build = function() {
    var origin = 0;
    var spacing = 120;
    var stepFamily = 0;
    var verticalOffset = 0;

    // Build the graph based on the custom data format.
    // This means determing x and y coordinates relative to the nodes.
    function graph(data) {
        stepFamily = 0;
        return processSteps({ step: data }, null, null);
    }

    function links(data) {
        var nodes = [];

        data.forEach(function(d, i) {
            // branches
            if(d.parent) {
                nodes.push({ source: d, target: d.parent })
            }
            // steps
            var sig1 = d.stepFamily + d.depth;
            var sig2 = data[i+1] ? data[i+1].stepFamily + data[i+1].depth : null;
            if(data[i+1] && sig1 === sig2) {
                nodes.push({ source: d, target: data[i+1] })
            }
        })

        return nodes;
    }

    // A branch is required to have leaf nodes that contain steps.
    // even if the step itself branches out.
    function processBranch(node, neighbor) {
        var children = [];
        verticalOffset = (spacing * (node.branch.length-1) / 2 );

        node.branch.forEach(function(branch) {
            children = children.concat(processSteps(branch, node, neighbor));
            verticalOffset -= spacing;
        })

        return children;
    }

    function processSteps(branch, parent, neighbor) {
        var children = [];
        stepFamily += 1;

        // connect first step to parent
        branch.step[0].parent = parent;

        branch.step.forEach(function(step, i) {
            var previousX = branch.step[i-1]
                                ? branch.step[i-1].x 
                                : (parent ? parent.x : 0 );
            var previousY = branch.step[i-1] 
                                ? branch.step[i-1].y 
                                : (parent ? (parent.y - verticalOffset) : World.height/2);
            if(!step.x) step.x = previousX + spacing;
            if(!step.y) step.y = previousY;
            if(parent && neighbor) neighbor.y = parent.y;
            if(neighbor) neighbor.x = step.x + spacing;

            step.stepFamily = stepFamily;
            step._id = step.name + '.' + step.stepFamily;

            // connect step to parent's sibling if convergent
            if(step.converge && neighbor) {
                step.parent = neighbor;
            }

            children.push(step);

            if(step.branch) {
                var stepChildren = processBranch(step, branch.step[i+1]);
                children = children.concat(stepChildren);
            }

        })

        return children;
    }

    // Public API
    return {
        graph : graph,
        links : links
    };
}();


function update(data) {
    var root = { x0:0, y0: World.height / 2 };
    var nodes = Build.graph(data);
    var active = [];
    nodes.forEach(function(d) {
        if (d.active) active.push(d);
    })

    showPage(nodes[0].page);

    // Update the nodes
    var node = World.serverDiagram.selectAll("g.node")
        .data(nodes, function(d) { 
            return d._id;
        });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("svg:g")
        .attr('class', function(d){ return 'node ' + d.type + ' ' + d.name })
        .attr("transform", function(d) {
            return "translate(" + root.x0 + "," + root.y0 + ")";
        })

    nodeEnter.call(Style.labels);

    for(key in Parse.items) {
        nodeEnter
            .filter(function(d){ return d.type === Parse.items[key].type })
            .call(Style[Parse.items[key].type])
    }

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(World.duration)
        .attr("transform", function(d) { 
            var computed_y = (['server', 'website'].indexOf(d.type) > -1 ? (d.y-30) : d.y);

            return "translate(" + d.x + "," + computed_y + ")";
        });

    nodeUpdate.select("circle")
        .attr("r", 7)
        .style("fill", 'lightsteelblue')


    nodeUpdate.select("text")
        .attr('dx', function(d) {
            return d.children || d._children ? -5 : 5;
        })
        .style("fill-opacity", 1);


    var nodeExit = node.exit().transition()
        .duration(World.duration)
        .style("fill-opacity", 0)
        .remove();

    nodeExit.select("circle").attr("r", 1e-6);
    nodeExit.select("text").style("fill-opacity", 1e-6);



    // LINKING DATA
    var linkData = Build.links(nodes);


    // Update the links…
    var link = World.serverDiagram.selectAll("path.link")
        //.data(linkData)
        .data(linkData, function(d) { return d.source._id + '.' + d.target._id; });

    // Enter any new links at the parent's previous position.
    var linkEnter = link.enter().insert("svg:path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
            var o = {x: root.x0, y: root.y0};
            return World.diagonal({source: o, target: o});
        })

    linkEnter.transition()
        .duration(World.duration)
        .attr("d", World.diagonal);

        linkEnter.filter(function(d) { 
            return (d.source.public && d.target.public);
        }).style('stroke-dasharray','none')

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

//---------------------------------------------------
// Initialize application

var World = {
    height : 600
    ,isServerDiagraminView : false
    ,duration : 500
    ,diagonal : d3.svg.diagonal()
                    .projection(function(d) { return [d.x, d.y]; })

}

World.wrap = d3.select("#world").append("svg:svg")
    .attr("height", World.height)

World.container = World.wrap
    .append("svg:g")
        .attr("transform", "translate(" + 0 + "," + 0 + ")")
        .style('background-color', "#ccc")

World.wrap.call(d3.behavior.zoom().on("zoom", function(){
    World.container.attr("transform",
        "translate(" + d3.event.translate + ")"
        + " scale(" + d3.event.scale + ")");
}))


World.width = d3.select('svg').node().clientWidth;

World.serverDiagram = World.container.append("svg:svg")
                        .attr('class', 'server-diagram')
                        .attr('x', 0)
                        .attr('y', 0)
                        .attr('transform', "translate(0, 0)")

World.description = d3.select("#description")
                        .style("height", World.height + 'px')


function startServer() {
    d3.json("/data/world.json?" + Math.random(), function(data) {

        Parse.items = data.items;

        World.data = Parse.stepDataFormat(data.world);

        update(World.data[0]);
        Navigation.render();
    })
}

startServer();

d3.select("body")
    .on("keydown", function(){
        if(d3.event.keyCode === 39) // right arrow
            Navigation.next();
        else if(d3.event.keyCode === 37) // left arrow
            Navigation.previous()
    })
