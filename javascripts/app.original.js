var viewport = d3.select("#viz");
var tree = d3.layout.tree().size([600,800]);
var page = 1;
var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

$("#navigation").find('li').click(function(e){
    render(this.innerHTML);
    $("#navigation").find('li').removeClass('active');
    $(this).addClass('active');
})

$("button.next").click(function(){
    page++;
    console.log(page);
    render(page);
})

$("button.prev").click(function(){
    page--;
    render(page);
})

vis = viewport.append("svg:svg")
    .attr("width", 1000)
    .attr("height", 600)
    .append("svg:g")
    .attr("transform", "translate(50, 0)");

function render(page) {
    d3.json((page + ".json?" + Math.random()), function(error, data) {        
        update(data)
    })
}


function update(data) {
    var nodes = tree.nodes(data);
    var paths, circles;
    paths = vis.selectAll("pathlink").data(tree.links(nodes));
        
    paths
        .enter().append("svg:path")
            .attr("class", "link")
            .attr("d", diagonal);

    console.log(nodes);
    circles = vis.selectAll("g.node").data(nodes, function(d) { console.log(d.name) ; return d.name });

    circles.enter()
      .append("svg:g")
        .attr('class', function(d){ return d.type })
        .append("svg:text")
          .attr("dy", -30)
          .attr("text-anchor", 'middle')
          .text(function(d) { return d.name; });

    console.log("enter size: " + circles.size() )
    var barUpdate = d3.transition(circles)
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
        .style("fill-opacity", 1);


    var barExit = d3.transition(circles.exit())
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
        .style("fill-opacity", 0)
        .remove();
    barExit.select("svg:text").remove();

    vis.selectAll("g.software").append("svg:circle")
      .attr('class', 'circle')
      .attr("r", 0)
      .transition()
        .duration(500)
        .attr("r", 15)
      // .on('click', function(e) {
      //   console.log('cricky');
      //   console.log(e);
      // })

    vis.selectAll("g.server").append("svg:rect")
      .attr('class', 'rect')
      .attr('y', -20)
      .attr('x', -20)
      .attr("height", 40)
      .attr("width", 35);
window.circles = circles;
}



render(page);

// vis.selectAll("g")
//     .style("opacity", 1) 
//     .transition()
//         .duration(500)
//         .style("opacity", 0)
//         .remove()

// vis.selectAll("path")
//     .style("opacity", 1) 
//     .transition()
//         .duration(500)
//         .style("opacity", 0)
//         .remove()

