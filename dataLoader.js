async function loadJSON(file) {
  const res = await fetch(file);
  const data = await res.json();
  return data;
}

async function loadQualities() {
  const qualities = await loadJSON("qualities.json");
  return qualities;
}

async function loadPresets() {
  const presets = await loadJSON("presets.json");
  return presets;
}

async function loadPrograms() {
  const programs = await loadJSON("programs.json");
  return programs;
}

async function loadMatrixActions() {
  const actions = await loadJSON("matrix_actions.json");
  return actions;
}

export {
  loadQualities,
  loadPresets,
  loadPrograms,
  loadMatrixActions
};
