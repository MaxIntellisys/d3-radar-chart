function RadarChart(selector, data) {
  const margin = { top: 100, right: 100, bottom: 100, left: 100 };
  const w = Math.min(700, window.innerWidth - 10) - margin.left - margin.right;
  const h = Math.min(w, window.innerHeight - margin.top - margin.bottom - 20);

  const options = {
    margin,
    w, //Width of the circle
    h, //Height of the circle
    levels: 7, //How many levels or inner circles should there be drawn
    labelFactor: 1.25, //How much farther than the radius of the outer circle should the labels be placed
    wrapWidth: 60, //The number of pixels after which a label needs to be given a new line
    opacityArea: 0.25, //The opacity of the area of the blob
    dotRadius: 4, //The size of the colored circles of each blog
    opacityCircles: 0.1, //The opacity of the circles of each blob
    strokeWidth: 2, //The width of the stroke around each blob
    roundStrokes: false, //If true the area and stroke will follow a round path (cardinal-closed)
    color: d3.scale.ordinal().range(["#EDC951", "#CC333F", "#00A0B0"]),
  };

  const maxValue = d3.max(data, (d) => d3.max(d.map((obj) => obj.value)));
  const allAxis = data[0].map((i) => i.axis); //Names of each axis
  const total = allAxis.length; //The number of different axes
  const radius = Math.min(options.w / 2, options.h / 2); //Radius of the outermost circle
  const Format = d3.format("%"); //Percentage formatting
  const angleSlice = (Math.PI * 2) / total; //The width in radians of each "slice"

  //Scale for the radius
  const rScale = d3.scale.linear().range([0, radius]).domain([0, maxValue]);

  //Remove whatever chart with the same id/class was present before
  d3.select(selector).select("svg").remove();

  //Initiate the radar chart SVG
  const svg = d3
    .select(selector)
    .append("svg")
    .attr("width", options.w + options.margin.left + options.margin.right)
    .attr("height", options.h + options.margin.top + options.margin.bottom)
    .attr("class", `radar${selector}`);
            
  const g = svg
    .append("g")
    .attr("transform", `translate(${options.w / 2 + options.margin.left}, ${options.h / 2 + options.margin.top})`);

  //Filter for the outside glow
  const filter = g.append("defs").append("filter").attr("id", "glow");
  const feGaussianBlur = filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "coloredBlur");
  const feMerge = filter.append("feMerge");
  const feMergeNode_1 = feMerge.append("feMergeNode").attr("in", "coloredBlur");
  const feMergeNode_2 = feMerge.append("feMergeNode").attr("in", "SourceGraphic");

  //Wrapper for the grid & axes
  const axisGrid = g.append("g").attr("class", "axisWrapper");

  //Draw the background circles
  axisGrid
    .selectAll(".levels")
    .data(d3.range(1, options.levels + 1).reverse())
    .enter()
    .append("circle")
    .attr("class", "gridCircle")
    .attr("r", (d, i) => (radius / options.levels) * d)
    .style("fill", "none") 
    .style("stroke", "#c7d4d6") 
    .style("fill-opacity", options.opacityCircles)
    .style("filter", "url(#glow)");

  //Text indicating at what % each level is
  axisGrid
    .selectAll(".axisLabel")
    .data(d3.range(1, options.levels + 1).reverse())
    .enter()
    .append("text")
    .attr("class", "axisLabel")
    .attr("x", 4)
    .attr("y", (d) => (-d * radius) / options.levels)
    .attr("dy", "0.4em")
    .style("font-size", "10px")
    .attr("fill", "#000")
    .text((d, i) => Format((maxValue * d) / options.levels));

  //Create the straight lines radiating outward from the center
  const axis = axisGrid
    .selectAll(".axis")
    .data(allAxis)
    .enter()
    .append("g")
    .attr("class", "axis");

  //Append the lines
  axis
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2",(d, i) => rScale(maxValue * 1.1) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y2",(d, i) => rScale(maxValue * 1.1) * Math.sin(angleSlice * i - Math.PI / 2))
    .attr("class", "line")
    // .style("stroke", "gray")
    // .style("stroke-width", "2px");  Remove line stroke by Lea's request.

  //Append the labels at each axis
  axis
    .append("text")
    .attr("class", "legend")
    .style("font-size", "12px")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("x",(d, i) => rScale(maxValue * options.labelFactor) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y",(d, i) => rScale(maxValue * options.labelFactor) * Math.sin(angleSlice * i - Math.PI / 2))
    .text((d) => d)
    .call(wrap, options.wrapWidth)
    .on("click", (d) => console.log(d));

  //The radial line function
  const radarLine = d3.svg.line
    .radial()
    .interpolate("linear-closed")
    .radius((d) => rScale(d.value))
    .angle((d, i) => i * angleSlice);

  if (options.roundStrokes) { radarLine.interpolate("cardinal-closed") }

  //Create a wrapper for the blobs
  const blobWrapper = g
    .selectAll(".radarWrapper")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "radarWrapper");

  //Append the backgrounds
  blobWrapper
    .append("path")
    .attr("class", "radarArea")
    .attr("d", (d, i) => radarLine(d))
    .style("fill", "none") //(d, i) => options.color(i)
    // .style("fill-opacity", options.opacityArea)      Remove fill color by Lea's request.
    .on("mouseover", blobWrapperMouseOver)
    .on("mouseout", blobWrapperMouseOut);

  //Create the outlines
  blobWrapper
    .append("path")
    .attr("class", "radarStroke")
    .attr("d", (d, i) => radarLine(d))
    .style("stroke-width", `${options.strokeWidth}px`)
    .style("stroke", (d, i) => options.color(i))
    .style("fill", "none")
    .style("filter", "url(#glow)");

  //Append the circles
  blobWrapper
    .selectAll(".radarCircle")
    .data((d, i) => d)
    .enter()
    .append("circle")
    .attr("class", "radarCircle")
    .attr("r", options.dotRadius)
    .attr("cx",(d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("cy",(d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
    .style("fill", (d, i, j) => options.color(j))
    .style("fill-opacity", 0.8);

  //Wrapper for the invisible circles on top
  const blobCircleWrapper = g
    .selectAll(".radarCircleWrapper")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "radarCircleWrapper");

  //Append a set of invisible circles on top for the mouseover pop-up
  blobCircleWrapper
    .selectAll(".radarInvisibleCircle")
    .data((d, i) => d)
    .enter()
    .append("circle")
    .attr("class", "radarInvisibleCircle")
    .attr("r", options.dotRadius * 1.5)
    .attr("cx",(d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("cy",(d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mouseover", blobCircleMouseOver)
    .on("mouseout", blobCircleMouseOut);

  //Set up the small tooltip for when you hover over a circle
  const tooltip = g.append("text").attr("class", "tooltip").style("opacity", 0);

  function wrap(text, width) {
    text.each(function () {
      let text = d3.select(this);
      let words = text.text().split(/\s+/).reverse();
      let word = "";
      let line = [];
      let lineNumber = 0;
      let lineHeight = 1.4; // ems
      let y = text.attr("y");
      let x = text.attr("x");
      let dy = parseFloat(text.attr("dy"));
      let tspan = text
        .text(null)
        .append("tspan")
        .attr("x", x)
        .attr("y", y)
        .attr("dy", dy + "em");

      while ((word = words.pop())) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text
            .append("tspan")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", ++lineNumber * lineHeight + dy + "em")
            .text(word);
        }
      }
    });
  }

  function blobWrapperMouseOver() {
    //Dim all blobs
    d3.selectAll(".radarArea")
      .transition()
      .duration(200)
      .style("fill-opacity", 0.1);
    //Bring back the hovered over blob
    d3.select(this).transition().duration(200).style("fill-opacity", 0.7);
  }

  function blobWrapperMouseOut() {
    //Bring back all blobs
    d3.selectAll(".radarArea")
      .transition()
      .duration(200)
      .style("fill-opacity", options.opacityArea);
  }

  function blobCircleMouseOver(d) {
    newX = parseFloat(d3.select(this).attr("cx")) - 10;
    newY = parseFloat(d3.select(this).attr("cy")) - 10;

    tooltip
      .attr("x", newX)
      .attr("y", newY)
      .text(Format(d.value))
      .transition()
      .duration(200)
      .style("opacity", 1);
  }

  function blobCircleMouseOut() {
    tooltip.transition().duration(200).style("opacity", 0);
  }
}
