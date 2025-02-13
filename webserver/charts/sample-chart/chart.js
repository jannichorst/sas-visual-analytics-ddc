document.addEventListener("DOMContentLoaded", function() {
    const data = [10, 20, 30, 40, 50];
    const width = 400;
    const height = 200;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", (d, i) => i * 50)
        .attr("y", d => height - d * 4)
        .attr("width", 40)
        .attr("height", d => d * 4)
        .attr("fill", "steelblue");
});
