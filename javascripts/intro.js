addNavigation();


var height = 600;

var world = d3.select("#body").append("svg:svg")
    .attr("width", '90%')
    .attr("height", height)
    .style('border', '1px dashed')
    .append("svg:g")
        .attr("transform", "translate(" + 0 + "," + 0 + ")")


world.append('svg:rect')    
    .attr("height", '100%')
    .attr("width", '100%')
    .style("fill", '#eee')


var vis = world.append("svg:svg").attr('class', 'server-diagram')
    .attr('x', "50%")
    .attr('y', 0)
    .style("overflow", 'visible')
    
var width = d3.select('svg').node().clientWidth;

function dragMove(d) {
    var start = -width;
    console.log(d3.event)
    d3.select(this)
        .attr("transform", "translate(" + d3.event.x + "," + d3.event.y + ")")
        // .attr('x', d3.event.x - width/2)
        // .attr('y', d3.event.y)
}


// internet line
var internet = world.append('svg:g').attr('class', 'internet')
    internet
        .append("line")
            .attr("x1", '50%')
            .attr("x2", '50%')
            .attr("y1", '100%')
            .style("stroke", "#222")
            .style("stroke-width", 1)

    internet.append('svg:text')
        .text("Public Internet")
        .attr('x', '50%')
        .style('font-size', 20)
        .style('fill', 'white')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.5em')
        .attr('stroke', 'whitesmoke')
        .attr('stroke-width', 8)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')

    internet.append('svg:text')
        .text("Public Internet")
        .attr('x', '50%')
        .style('font-size', 20)
        .attr('text-anchor', 'middle')
        .attr('dy', '1.5em')


// server
var server = world.append('svg:svg')
    .attr('x', "50%")
    .attr('y', "50%")
    .attr('class', 'server')
    .on('click', function(d) {
        world.transition()
            .duration(1500)
            .attr("transform", "translate(-500, 0)")
            .each('end', function(){
                startServer()
            })

    })
server.append('svg:rect')    
    .attr('transform', "translate(50,0)")
    .attr("height", 30)
    .attr("width", 24)
    .style("fill", 'orange')
server.append('svg:text')
    .attr('transform', "translate(80,-2)")
    .text("Website")
    .style('font-size', 14)
    .attr('text-anchor', 'start')
    .attr('dy', '1.5em')


// client
var client = world.append('svg:svg')
    .attr('x', "50%")
    .attr('y', "50%")
    .attr('class', 'client')
    .style("overflow", 'visible')
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



//---------------------------------------------------



var m = [20, 120, 20, 120],
    w = 1280 - m[1] - m[3],
    h = 600 - m[0] - m[2],
    i = 0;

var tree = d3.layout.tree().size([h, w]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });


var start;
var database;

function startServer() {
    d3.json("/data/database.json", function(json) {  
        database = json;
        database.x = h / 2;
        database.y = 1000;
        database.x0 = database.x;
        database.y0 = database.y;

        d3.json("/data/1.json", function(json) {
            start = json;
            start.x0 = h / 2;
            start.y0 = 0;

            update(start, start);
        })
    })
}
