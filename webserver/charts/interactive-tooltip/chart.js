document.addEventListener("DOMContentLoaded", function () {
    function drawChart() {
        const data = [10, 40, 30, 20, 50, 80, 60];
        
        const container = document.getElementById("container");
        const chartElement = document.getElementById("chart");
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        d3.select(chartElement).selectAll("*").remove(); // Clear existing SVG
        
        const svg = d3.select(chartElement)
            .attr("width", width)
            .attr("height", height);
        
        const margin = { top: 40, right: 30, bottom: 30, left: 40 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        const xScale = d3.scaleBand()
            .domain(data.map((_, i) => i))
            .range([0, chartWidth])
            .padding(0.1);
        
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data)])
            .nice()
            .range([chartHeight, 0]);
        
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        // Bars with hover effect
        const bars = g.selectAll("rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", (_, i) => xScale(i))
            .attr("y", d => yScale(d))
            .attr("width", xScale.bandwidth())
            .attr("height", d => chartHeight - yScale(d))
            .attr("fill", "steelblue")
            .on("mouseover", function (event, d) {
                d3.select(this).attr("fill", "darkblue");
                g.append("text")
                    .attr("id", "tooltip-text")
                    .attr("x", xScale(data.indexOf(d)) + xScale.bandwidth() / 2)
                    .attr("y", yScale(d) - 5)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "12px")
                    .attr("fill", "black")
                    .text(d);
            })
            .on("mouseout", function () {
                d3.select(this).attr("fill", "steelblue");
                g.select("#tooltip-text").remove();
            });
        
        g.append("g")
            .attr("transform", `translate(0,${chartHeight})`)
            .call(d3.axisBottom(xScale).tickFormat(d => d + 1).tickSizeOuter(0));
        
        g.append("g")
            .call(d3.axisLeft(yScale));
    }
    
    drawChart(); // Initial draw
    window.addEventListener("resize", drawChart); // Redraw on resize
});

