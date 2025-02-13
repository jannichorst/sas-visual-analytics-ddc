document.addEventListener("DOMContentLoaded", function () {
    function drawChart(data = [10, 40, 30, 20, 50, 80, 60]) {
        const container = document.getElementById("container");
        const chartElement = document.getElementById("chart");

        const width = container.clientWidth;
        const height = container.clientHeight;

        d3.select(chartElement).selectAll("*").remove(); // Clear existing chart

        const svg = d3.select(chartElement)
            .attr("width", width)
            .attr("height", height);

        const margin = { top: 40, right: 30, bottom: 40, left: 50 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const xScale = d3.scaleBand()
            .domain(data.map((_, i) => i))
            .range([0, chartWidth])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)])
            .nice()
            .range([chartHeight, 0]);

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Bars with hover effect
        g.selectAll("rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", d => xScale(d.label))
            .attr("y", d => yScale(d.value))
            .attr("width", xScale.bandwidth())
            .attr("height", d => chartHeight - yScale(d.value))
            .attr("fill", "steelblue")
            .on("mouseover", function (event, d) {
                d3.select(this).attr("fill", "darkblue");
                g.append("text")
                    .attr("id", "tooltip-text")
                    .attr("x", xScale(d.label) + xScale.bandwidth() / 2)
                    .attr("y", yScale(d.value) - 10)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "12px")
                    .attr("fill", "black")
                    .text(d.value);
            })
            .on("mouseout", function () {
                d3.select(this).attr("fill", "steelblue");
                g.select("#tooltip-text").remove();
            });

        // X-axis
        g.append("g")
            .attr("transform", `translate(0,${chartHeight})`)
            .call(d3.axisBottom(xScale).tickFormat(d => d + 1));

        // Y-axis
        g.append("g").call(d3.axisLeft(yScale));
    }

    // Function to process VA data
    function onMessage(event) {
        if (!event || !event.data) return;
        const vaData = event.data.data;
        const columns = event.data.columns;

        if (vaData.length === 0 || columns.length < 2) return;

        const formattedData = vaData.map(row => ({
            label: row[0],
            value: parseFloat(row[1])
        }));

        drawChart(formattedData); // Update chart dynamically
    }

    // Listen for data from SAS VA
    if (window.addEventListener) {
        window.addEventListener("message", onMessage, false);
    } else {
        window.attachEvent("onmessage", onMessage);
    }

    drawChart(); // Initial draw with dummy data
    window.addEventListener("resize", () => drawChart()); // Redraw on resize
});
