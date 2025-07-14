import {
  loadQualities,
  loadPresets,
  loadPrograms,
  loadMatrixActions,
  initProgramSlots
} from './dataLoader.js';

import {
  getAttributes,
  getSkills,
  applyImprovements,
  renderMatrixActions
} from './modifiers.js';

function makeProgramsDraggable(programs) {
  const container = $("#program-list");
  container.empty();
  programs.forEach(prog => {
    const item = $("<div>")
      .addClass("program-item")
      .attr("draggable", true)
      .text(prog.name)
      .on("dragstart", function (e) {
        e.originalEvent.dataTransfer.setData("text/plain", prog.name);
      })
      .hover(function (e) {
        $("#program-tooltip").text(prog.description).css({
          top: e.pageY + 10 + "px",
          left: e.pageX + 10 + "px"
        }).show();
      }, function () {
        $("#program-tooltip").hide();
      })
      .on("mousemove", function (e) {
        $("#program-tooltip").css({
          top: e.pageY + 10 + "px",
          left: e.pageX + 10 + "px"
        });
      });
    container.append(item);
  });
}

function updateDeckStatLabels(deckStats) {
  $("#draggables .stat-box").each(function () {
    const type = $(this).data("type");
    if (deckStats[type] !== undefined) {
      $(this).find("span").text(deckStats[type]);
    }
  });
}

function saveState() {
  const state = {
    attributes: getAttributes(),
    skills: getSkills(),
    qualities: $(".quality-checkbox:checked").map((_, el) => $(el).val()).get(),
    selectedPreset: $("#preset-selector").val(),
    programSlots: $(".program-slot").map((_, el) => $(el).text()).get()
  };
  localStorage.setItem("cyberdeckState", JSON.stringify(state));
}

$(document).ready(async function () {
  const [qualities, presets, programs, matrixActions] = await Promise.all([
    loadQualities(),
    loadPresets(),
    loadPrograms(),
    loadMatrixActions()
  ]);

  const container = $("#quality-list");
  qualities.forEach(q => {
    const checkbox = $(`<label class="quality-checkbox">
        <input type="checkbox" value="${q.name}"> ${q.name}
      </label>`);
    container.append(checkbox);
  });

  const presetSelect = $("#preset-selector");
  presets.forEach(p => {
    const opt = $(`<option value="${p.name}">${p.name}</option>`);
    presetSelect.append(opt);
  });

  makeProgramsDraggable(programs);

  const saved = JSON.parse(localStorage.getItem("cyberdeckState") || "{}");
  if (saved.attributes) {
    for (const key in saved.attributes) {
      $(`#attr-${key}`).val(saved.attributes[key]);
    }
  }
  if (saved.skills) {
    for (const key in saved.skills) {
      $(`#skill-${key}`).val(saved.skills[key]);
    }
  }
  if (saved.selectedPreset) {
    presetSelect.val(saved.selectedPreset).trigger("change");
  }
  if (saved.qualities) {
    saved.qualities.forEach(q => $(`.quality-checkbox input[value="${q}"]`).prop("checked", true));
  }

  const activePreset = presets.find(p => p.name === saved.selectedPreset) || presets[0];
  initProgramSlots(
    activePreset.programSlots || 6,
    saved.programSlots || [],
    saveState
  );

  function updateMatrixActions() {
    const baseStats = presets.find(p => p.name === $("#preset-selector").val()) || presets[0];
    const selectedQualities = $(".quality-checkbox:checked").map((_, el) => {
      return qualities.find(q => q.name === $(el).val());
    }).get();
    const modifiedStats = applyImprovements({
      attributes: getAttributes(),
      skills: getSkills(),
      deckStats: { ...baseStats },
    }, selectedQualities);

    updateDeckStatLabels(modifiedStats.deckStats);
    renderMatrixActions(
      matrixActions,
      modifiedStats.attributes,
      modifiedStats.skills,
      modifiedStats.deckStats,
      modifiedStats.matrixActions || {}
    );
  }

  updateMatrixActions();

  $("input, select").on("input change", function () {
    updateMatrixActions();
    saveState();
  });

  $("#preset-selector").on("change", function () {
    const selected = presets.find(p => p.name === $(this).val());
    if (selected) {
      updateDeckStatLabels(selected);
      updateMatrixActions();
    }
  });

  $("#reset-factory").on("click", function () {
    localStorage.removeItem("cyberdeckState");
    location.reload();
  });

  $("#left-toggle").on("click", function () {
    $("#left-panel").toggleClass("open");
  });

  $("#right-toggle").on("click", function () {
    $("#right-panel").toggleClass("open");
  });
});

