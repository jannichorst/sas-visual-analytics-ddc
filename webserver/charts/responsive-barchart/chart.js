document.addEventListener("DOMContentLoaded", function () {
    let latestData = null; // Store the latest data received from SAS VA

    function drawChart(data) {
        if (!data || data.length === 0) return;

        latestData = data; // Update the stored data

        const container = document.getElementById("container");
        const chartElement = document.getElementById("chart");

        const width = container.clientWidth;
        const height = container.clientHeight;

        d3.select(chartElement).selectAll("*").remove(); // Clear existing chart

        const svg = d3.select(chartElement)
            .attr("width", width)
            .attr("height", height);

        // **Create a temporary Y scale to estimate label width**
        const tempYScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)])
            .nice()
            .range([height - 80, 0]); // Arbitrary height just for measurement

        // **Measure the largest label width**
        const tempSvg = d3.select("body").append("svg").attr("class", "temp-svg");
        const tempText = tempSvg.append("g")
            .call(d3.axisLeft(tempYScale))
            .selectAll("text");

        let maxLabelWidth = 0;
        tempText.each(function () {
            const bbox = this.getBBox();
            if (bbox.width > maxLabelWidth) {
                maxLabelWidth = bbox.width;
            }
        });

        tempSvg.remove(); // Clean up temporary elements

        // **Dynamic left margin based on maxLabelWidth**
        const margin = { top: 40, right: 30, bottom: 60, left: maxLabelWidth + 10 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.label))
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

        // X-axis with rotated labels
        g.append("g")
            .attr("transform", `translate(0,${chartHeight})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-0.8em")
            .attr("dy", "0.15em")
            .attr("transform", "rotate(-45)");

        // **Apply dynamically calculated left margin to Y-axis**
        g.append("g").call(d3.axisLeft(yScale));
    }

    // Function to process VA data
    function onMessage(event) {
        if (!event || !event.data) return;
        const vaData = event.data.data;
        const columns = event.data.columns;

        if (vaData.length === 0 || columns.length < 2) return;

        const formattedData = vaData.map(row => ({
            label: row[0], // Use the first column as categorical labels
            value: parseFloat(row[1]) // Use the second column as numerical values
        }));

        drawChart(formattedData); // Update chart dynamically
    }

    // Listen for data from SAS VA
    if (window.addEventListener) {
        window.addEventListener("message", onMessage, false);
    } else {
        window.attachEvent("onmessage", onMessage);
    }

    // On resize, redraw with the latest received data (if available)
    window.addEventListener("resize", function () {
        if (latestData) {
            drawChart(latestData); // Redraw using latest dataset
        }
    });
});
