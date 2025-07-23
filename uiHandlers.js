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

function updateDeckStatLabels(deckStats) {
  for (const key in deckStats) {
    $(`#draggables .stat-box[data-type="${key}"] span`).text(deckStats[key]);
  }
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

  // Add drag-swap logic
  $("#draggables .stat-box").on("dragstart", function (e) {
    e.originalEvent.dataTransfer.setData("text/plain", $(this).data("type"));
  });

  $("#draggables .stat-box").on("dragover", function (e) {
    e.preventDefault();
    $(this).addClass("drag-over");
  });

  $("#draggables .stat-box").on("dragleave", function () {
    $(this).removeClass("drag-over");
  });

  $("#draggables .stat-box").on("drop", function (e) {
    e.preventDefault();
    $(this).removeClass("drag-over");

    const sourceType = e.originalEvent.dataTransfer.getData("text/plain");
    const targetBox = $(this);
    const targetType = targetBox.data("type");

    if (sourceType === targetType) return;

    const sourceBox = $(`#draggables .stat-box[data-type="${sourceType}"]`);
    const sourceVal = sourceBox.find("span").text();
    const targetVal = targetBox.find("span").text();

    sourceBox.addClass("swap");
    targetBox.addClass("swap");

    setTimeout(() => {
      sourceBox.find("span").text(targetVal);
      targetBox.find("span").text(sourceVal);
      sourceBox.removeClass("swap");
      targetBox.removeClass("swap");
    }, 150);

    const temp = sourceBox.data("type");
    sourceBox.data("type", targetType);
    targetBox.data("type", temp);
  });
});

