import { useEffect, useRef } from "react";

export default function GraphBox({ graph, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";

    if (!graph || !graph.functions || graph.functions.length === 0) return;

    const width = Math.max(el.clientWidth || 400, 220);
    try {
      window.functionPlot({
        target: el,
        width,
        height: 240,
        grid: true,
        xAxis: { domain: graph.xDomain || [-10, 10] },
        yAxis: { domain: graph.yDomain || [-10, 10] },
        data: graph.functions.map((fn) => ({ fn })),
      });
    } catch (err) {
      el.textContent = "Не вдалося побудувати графік — перевір формулу.";
    }
  }, [graph]);

  const hasGraph = !!(graph && graph.functions && graph.functions.length);

  return (
    <div
      ref={ref}
      className={`${hasGraph ? "w-full mt-4 bg-white rounded-md p-2.5 shadow-pill" : ""} ${className}`}
    />
  );
}
