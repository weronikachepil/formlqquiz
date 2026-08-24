const COMPLETED_KEY = "formlq_completed_sections";

function loadCompletedSections() {
  try {
    return JSON.parse(localStorage.getItem(COMPLETED_KEY)) || {};
  } catch (e) {
    return {};
  }
}

export function markSectionCompleted(blockId, sectionIndex) {
  const data = loadCompletedSections();
  data[`${blockId}::${sectionIndex}`] = Date.now();
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(data));
}

export function isSectionCompleted(blockId, sectionIndex) {
  return !!loadCompletedSections()[`${blockId}::${sectionIndex}`];
}

export function shuffle(array) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pluralSuffix(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "и";
  return "ів";
}
