const KATEX_DELIMITERS = [
  { left: "$$", right: "$$", display: true },
  { left: "\\[", right: "\\]", display: true },
  { left: "$", right: "$", display: false },
  { left: "\\(", right: "\\)", display: false },
];

const KATEX_MACROS = {
  "\\tg": "\\operatorname{tg}",
  "\\ctg": "\\operatorname{ctg}",
  "\\arctg": "\\operatorname{arctg}",
  "\\arcctg": "\\operatorname{arcctg}",
};

export function renderMath(el) {
  if (el && window.renderMathInElement) {
    window.renderMathInElement(el, { delimiters: KATEX_DELIMITERS, macros: KATEX_MACROS, throwOnError: false });
  }
}
