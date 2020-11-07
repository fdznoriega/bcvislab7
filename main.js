
// load data
Promise.all([
    // load multiple files
    d3.json('./airports.json'),
    d3.json('./world-110m.json')
]).then( ([a, w]) => {
    worldMap(w);
    network(a);

})

let airports;
let worldMapData;
let visType = "force";
let simulation;
let projection;

// create svg
const margin = {top: 50, right: 50, bottom: 50, left: 50}
const width = 650 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

const svg = d3.select(".chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

function network(data) {
    airports = data;

    // scale for sizing circles based on number of passengers
    const circleScale = d3.scaleLinear().range([5, 20]);

    // update scale once data loads
    // get passenger data
    circleScale.domain(d3.extent(airports.nodes.map(d => d.passengers)));

    simulation = d3.forceSimulation(airports.nodes)
        .force("charge", d3.forceManyBody())
        .force("link", d3.forceLink(airports.links))
        .force("center", d3.forceCenter(width / 2, height / 2));

    // draw links
    const links = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(airports.links)
        .join("line")
        .attr("stroke-width", 1)
        .attr("opacity", 1)

    // draw nodes
    const nodes = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(airports.nodes)
        .join("circle")
        .attr("fill", "orange")
        .attr("r", d => circleScale(d.passengers))
        .call(drag(simulation))

    // add a title to the nodes
    nodes.append("title")
        .text(d=>d.name);
    
    // update the force simulation to put things where they belong
    simulation.on("tick", () => {
        links
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        nodes
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    })

}

function worldMap(data) {
    
    // convert to GeoJSON
    const geoJSON = topojson.feature(data, data.objects.countries);

    // create a projection
    projection = d3.geoMercator()
        .fitExtent([[0,0], [width,height]], geoJSON);
    
    // create a path generator
    const path = d3.geoPath(projection);

    // append to the svg
    svg.selectAll("path")
        .data(geoJSON.features)
        .join("path")
        .attr("d", path);

    // add borders
    svg.append("path")
        .datum(topojson.mesh(data, data.objects.countries))
        .attr("d", path)
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr("class", "subunit-boundary");
    
    // add opacity to all paths
    svg.selectAll("path")
        .attr("opacity", 1)

}

function drag(simulation) {
  
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.2).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
        .filter(event => visType === "force")
}

function switchLayout() {
    if (visType === "map") {
        // stop the simulation
        simulation.stop();
        // set the positions of links and nodes based on geo-coordinates
        d3.selectAll("circle")
            .join("circle")
            .transition()
            .duration(1000)
            .attr("cx", d => d.x = projection([d.longitude, d.latitude])[0])
            .attr("cy", d => d.y = projection([d.longitude, d.latitude])[1])

        d3.selectAll("line")
            .join("line")
            .transition()
            .duration(1000)
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        
        // set the map opacity to 1
        d3.selectAll("path")
            .join("path")
            .transition()
            .duration(1000)
            .attr("opacity", 1)

	} else { 
        // restart the simulation
        simulation.restart();
        // set the map opacity to 0
        d3.selectAll("path")
            .join("path")
            .transition()
            .duration(1000)
            .attr("opacity", 0)
	}
}

// event listener for click
d3.selectAll("input[type=radio]").on("change", event=>{
    visType = event.target.value;// selected button
	switchLayout();
});


