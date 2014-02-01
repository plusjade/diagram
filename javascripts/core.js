var Style = {
    software : function(nodes) {
        return nodes
            .append("svg:circle")
            //.attr("r", '2em')
            .style("fill", 'lightsteelblue');
    }

    ,servers : function(nodes) {
        return nodes
            .append("svg:rect")
            .attr('class', 'rect')
            .attr("height", 40)
            .attr("width", 34)
    }
    ,internet : function(nodes) {
        return nodes.append('svg:g').attr('class', '_internet')
            .append("line")
                .attr("y1", '-50%')
                .attr("y2", '50%')
                .attr("stroke-dasharray", "3, 3")


        return nodes
            .append("svg:circle")
            .attr("r", 1e-10)
            .style("fill", '#333');
    }
    ,website : function(nodes) {
        return nodes
            .append("svg:rect")
            .attr('class', 'rect')
            .attr("height", 30)
            .attr("width", 24)
    }
    ,webBrowser : function(nodes) {
        return nodes
            .append('path')
            .attr('d', d3.svg.symbol().type('diamond').size(600))
            .style("fill", '#0B486B');
    }
    ,labels : function(nodes) {
        return nodes
            .append("svg:text")
            .attr("dy", "-1em")
            .attr("text-anchor", function(d) { 
                return "middle";
            })
            .text(function(d) { return d.name; })
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
        World.data[index].x0 = World.height/2;
        World.data[index].y0 = 0;
        
        update(World.data[0], World.data[index]);
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
    parseLinearDataFormat : function(data) {
        var self = this;
        return data.map(function(node) {
            return self.processSteps(node)
        })
    }
    ,
    processSteps : function(node) {
        var self = this;
        var steps = self.expandItems(node.step);

        // Recursively evaulate any branches with sub-steps.
        steps.forEach(function(sub) {
            if(!sub.branch) return;

            sub.branch.forEach(function(b) {
                b.step = self.processSteps(b);
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
    var verticalOrigin = 300;
    var spacing = 110;
    var family = 0;

    // Build the graph based on the custom data format.
    // This means determing x and y coordinates relative to the nodes.
    function graph(data) {
        origin = 0;
        var nodes = [];
        data.forEach(function(d, i) {
            d.family = family;
            d.x = verticalOrigin;
            d.y = (i * spacing) + origin;

            nodes.push(d);

            if(d.branch) {
                nodes = nodes.concat(processBranch(d, data[i+1]));
            }
        });

        return nodes;
    }

    function links(data) {
        var nodes = [];

        data.forEach(function(d, i) {
            if(d.parent) {
                nodes.push({ source: d, target: d.parent })
            }
            if(data[i+1] && d.family === data[i+1].family) {
                nodes.push({ source: d, target: data[i+1] })
            }
        })

        return nodes;
    }

    function processBranch(node, neighbor) {
        var children = [];
        var offset = (spacing * (node.branch.length-1) / 2 );

        // how much room to make for child branches?
        // best guest for now: 
        var length = node.branch[0].step.length;
        origin += spacing*length;

        node.branch.forEach(function(b) {
            family += 1;

            // connect first step to parent
            b.step[0].parent = node;

            // connect last step to parent's sibling (if convergent)
            if(b.converge && neighbor) {
                b.step[b.step.length-1].parent = neighbor;
            }

            b.step.forEach(function(sub, x) {
                sub.family = family;
                sub.x = node.x - offset;
                sub.y = node.y + ((x+1) * spacing);

                children.push(sub);
                if(sub.branch) {
                    children = children.concat(processBranch(sub, b[x+1]));
                }

            })
            offset -= spacing;
        })

        return children;
    }

    // Public API
    return {
        graph : graph,
        links : links
    };
}();


function update(root, data) {
    var nodes = Build.graph(data);
    var active = [];
    nodes.forEach(function(d) {
        if (d.active) active.push(d);
    })

    showPage(nodes[0].page);

    // Update the nodes
    var node = World.serverDiagram.selectAll("g.node")
        .data(nodes, function(d) { return d.name });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("svg:g")
        .attr('class', function(d){ return 'node ' + d.type + ' ' + d.name })
        .attr("transform", function(d) { return "translate(" + root.y0 + "," + root.x0 + ")"; })

    nodeEnter.call(Style.labels);

    nodeEnter
        .filter(function(d){ return d.type === 'web-browser' })
        .call(Style.webBrowser)
    nodeEnter
        .filter(function(d){ return d.type === 'website' })
        .call(Style.website)
    nodeEnter
        .filter(function(d){ return d.type === 'software' })
        .call(Style.software)

    nodeEnter
        .filter(function(d){ return d.type === 'server' })
        .call(Style.servers)
    nodeEnter
        .filter(function(d){ return d.type === 'internet' })
        .call(Style.internet)

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(World.duration)
        .attr("transform", function(d) { 
            var computed_x = (['server', 'website'].indexOf(d.type) > -1 ? (d.x-30) : d.x);

            return "translate(" + d.y + "," + computed_x + ")";
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
        .data(linkData, function(d) { return d.source.name + '.' + d.target.name; });

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

    // FIXME: should not be a timeout
    // reposition logic
    setTimeout(function() {
        console.log("reposition")
        var dimensions = World.serverDiagram.node().getBBox();
        var offset = (d3.select('svg').node().clientWidth - dimensions.width)/2;
        if(offset > 0) {
            World.serverDiagram.transition()
                .duration(World.duration)
                .attr('x', offset)
        }
    }, 1000)
}

//---------------------------------------------------
// Initialize application

var World = {
    height : 600
    ,isServerDiagraminView : false
    ,duration : 500
    ,diagonal : d3.svg.diagonal()
                    .projection(function(d) { return [d.y, d.x]; })

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

World.tree = d3.layout.tree().size([World.height, World.width/2])
    .separation(function (a, b) {
        console.log('separation')
         return 100;
         return a.parent == b.parent ? 1 : 2;
    })//.nodeSize([800,400])

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

        World.data = Parse.parseLinearDataFormat(data.world);

        World.data[0][0].x0 = World.height / 2;
        World.data[0][0].y0 = 0;

        update(World.data[0], World.data[0]);
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
