export function loadQualities() {
  return fetch("qualities.json").then(res => res.json());
}

export function loadPresets() {
  return fetch("presets.json").then(res => res.json());
}

export function loadPrograms() {
  return fetch("programs.json").then(res => res.json());
}

export function loadMatrixActions() {
  return fetch("matrix_actions.json").then(res => res.json());
}

export function initProgramSlots(count, savedPrograms = [], saveStateCallback = () => {}) {
  const container = $("#program-slots");
  container.empty();
  for (let i = 0; i < count; i++) {
    const slot = $("<div>")
      .addClass("program-slot")
      .attr("data-index", i)
      .on("dragover", function (e) {
        e.preventDefault();
        $(this).addClass("drag-over");
      })
      .on("dragleave", function () {
        $(this).removeClass("drag-over");
      })
      .on("drop", function (e) {
        e.preventDefault();
        $(this).removeClass("drag-over");
        const program = e.originalEvent.dataTransfer.getData("text/plain");
        $(this).text(program);
        saveStateCallback(); 
      });
    if (savedPrograms[i]) slot.text(savedPrograms[i]);
    container.append(slot);
  }
}
