async function loadJSON(file) {
  const res = await fetch(file);
  return await res.json();
}

async function loadQualities() {
  return await loadJSON("qualities.json");
}

async function loadPresets() {
  return await loadJSON("presets.json");
}

async function loadPrograms() {
  return await loadJSON("programs.json");
}

async function loadMatrixActions() {
  return await loadJSON("matrix_actions.json");
}

function initProgramSlots(slotCount, savedSlots, onProgramChange) {
  const container = $("#program-slots");
  container.empty();
  for (let i = 0; i < slotCount; i++) {
    const slot = $("<div>")
      .addClass("program-slot")
      .attr("data-slot", i)
      .text(savedSlots[i] || "")
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

        const draggedText = e.originalEvent.dataTransfer.getData("text/plain");
        const $existing = $(this).text();
        if ($existing && $existing !== draggedText) {
          // Swap
          $(".program-slot").filter((_, el) => $(el).text() === draggedText).text($existing);
        }
        $(this).text(draggedText);
        onProgramChange();
      });
    container.append(slot);
  }
}

export {
  loadQualities,
  loadPresets,
  loadPrograms,
  loadMatrixActions,
  initProgramSlots
};
