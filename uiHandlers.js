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

function renderDeckNotes(notes) {
  const notesContainer = $("#deck-notes");
  const list = $("#notes-list");
  list.empty();

  if (notes && notes.length > 0) {
    notes.forEach(note => list.append($("<li>").text(note)));
    notesContainer.show();
  } else {
    notesContainer.hide();
  }
}

function updateDeckStatLabels(baseStats, modifiedStats) {
  for (const key in baseStats) {
    const $label = $(`#draggables .stat-box[data-type="${key}"]`);
    $label.find("span").text(baseStats[key]);

    let aug = modifiedStats[key];
    let $augEl = $label.find(".augmented-value");

    if (!$augEl.length) {
      $augEl = $("<div>").addClass("augmented-value").appendTo($label);
    }

    if (aug !== baseStats[key]) {
      $augEl.text(`(${aug})`).show();
    } else {
      $augEl.hide();
    }
  }
}

function updateAugmentedInputs(modified, base, selectorPrefix) {
  for (const key in base) {
    const $input = $(`${selectorPrefix}-${key}`);
    if (!$input.length) continue;

    let $augEl = $input.siblings(".augmented-value");

    if (!$augEl.length) {
      $augEl = $("<span>")
        .addClass("augmented-value")
        .css({ marginLeft: "0.5em", color: "#aaa" })
        .insertAfter($input);
    }

    if (modified[key] !== base[key]) {
      $augEl.text(`(${modified[key]})`).show();
    } else {
      $augEl.hide();
    }
  }
}

function makeProgramsDraggable(programs, onProgramChange) {
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

  $(".program-slot").on("drop", function () {
    onProgramChange();
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
    () => {
      updateMatrixActions();
      saveState();
    }
  );

  makeProgramsDraggable(programs, () => {
    updateMatrixActions();
    saveState();
  });

  function updateMatrixActions() {
    const selectedPreset = presets.find(p => p.name === $("#preset-selector").val()) || presets[0];
    const selectedQualities = $(".quality-checkbox:checked").map((_, el) => {
      return qualities.find(q => q.name === $(el).val());
    }).get();

    const inputStats = {
      attributes: getAttributes(),
      skills: getSkills(),
      deckStats: { ...selectedPreset }
    };

    const modifiedStats = applyImprovements(
      inputStats,
      selectedQualities,
      matrixActions
    );

    renderMatrixActions(
      matrixActions,
      modifiedStats.attributes,
      modifiedStats.skills,
      modifiedStats.deckStats,
      modifiedStats.matrixActions || {}
    );

    updateDeckStatLabels(selectedPreset, modifiedStats.deckStats);
    updateAugmentedInputs(modifiedStats.attributes, inputStats.attributes, "#attr");
    updateAugmentedInputs(modifiedStats.skills, inputStats.skills, "#skill");
    renderDeckNotes(modifiedStats.notes || []);
  }

  updateMatrixActions();

  $("input, select").on("input change", function () {
    updateMatrixActions();
    saveState();
  });

  $("#quality-list").on("change", "input[type='checkbox']", function () {
    updateMatrixActions();
    saveState();
  });

  $("#preset-selector").on("change", function () {
    const selected = presets.find(p => p.name === $(this).val());
    if (selected) {
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

  let draggedBox = null;

  $("#draggables .stat-box").on("dragstart", function (e) {
    draggedBox = this;
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

    const targetBox = this;
    if (draggedBox === targetBox) return;

    const sourceSpan = $(draggedBox).find("span");
    const targetSpan = $(targetBox).find("span");

    const sourceVal = sourceSpan.text();
    const targetVal = targetSpan.text();

    $(draggedBox).addClass("swap");
    $(targetBox).addClass("swap");

    setTimeout(() => {
      sourceSpan.text(targetVal);
      targetSpan.text(sourceVal);
      $(draggedBox).removeClass("swap");
      $(targetBox).removeClass("swap");

      // Recalculate after swap
      updateMatrixActions();
      saveState();
    }, 150);
  });
});
