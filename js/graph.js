function renderGraph(containerEl, graph) {
  containerEl.innerHTML = "";

  if (!graph || !graph.functions || graph.functions.length === 0) {
    return;
  }

  const width = Math.max(containerEl.clientWidth || 400, 220);

  try {
    functionPlot({
      target: containerEl,
      width,
      height: 240,
      grid: true,
      xAxis: { domain: graph.xDomain || [-10, 10] },
      yAxis: { domain: graph.yDomain || [-10, 10] },
      data: graph.functions.map((fn) => ({ fn })),
    });
  } catch (err) {
    containerEl.textContent = "Не вдалося побудувати графік — перевір формулу.";
  }
}
