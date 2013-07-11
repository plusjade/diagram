var height = 600;

var world = d3.select("#body").append("svg:svg")
    .attr("width", '100%')
    .attr("height", height)
    .style('border', '1px solid')
    .style('background-color', "#FFF")
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
