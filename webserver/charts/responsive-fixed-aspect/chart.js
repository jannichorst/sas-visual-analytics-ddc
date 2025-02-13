document.addEventListener("DOMContentLoaded", function () {
    function drawChart() {
        const data = [10, 40, 30, 20, 50, 80, 60];
        
        const container = document.getElementById("container");
        const chartElement = document.getElementById("chart");
        const width = container.clientWidth;
        const height = container.clientHeight;
        const size = Math.min(width, height); // Keep proportions
        const radius = size / 2 - 20; // Adjust for margins
        
        d3.select(chartElement).selectAll("*").remove(); // Clear existing SVG
        
        const svg = d3.select(chartElement)
            .attr("width", size)
            .attr("height", size)
            .append("g")
            .attr("transform", `translate(${size / 2}, ${size / 2})`);
        
        const pie = d3.pie().value(d => d);
        const arc = d3.arc().innerRadius(0).outerRadius(radius);
        
        const color = d3.scaleOrdinal(d3.schemeCategory10);
        
        svg.selectAll("path")
            .data(pie(data))
            .enter()
            .append("path")
            .attr("d", arc)
            .attr("fill", (_, i) => color(i))
            .attr("stroke", "white")
            .style("stroke-width", "2px");
    }
    
    drawChart(); // Initial draw
    window.addEventListener("resize", drawChart); // Redraw on resize
});

