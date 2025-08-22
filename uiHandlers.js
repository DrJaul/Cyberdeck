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
        e.originalEvent.dataTransfer.setData("source", "program-list");
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
    programSlots: $(".program-slot").map((_, el) => $(el).text()).get(),
    swappedStats: {
      attack: $("#draggables .stat-box[data-type='attack'] span").text(),
      sleaze: $("#draggables .stat-box[data-type='sleaze'] span").text(),
      dataProcessing: $("#draggables .stat-box[data-type='dataProcessing'] span").text(),
      firewall: $("#draggables .stat-box[data-type='firewall'] span").text()
    }
  };
  localStorage.setItem("cyberdeckState", JSON.stringify(state));
}

function updateDeckStatLabels(deckStats) {
  $("#draggables .stat-box").each(function () {
    const type = $(this).data("type");
    $(this).find("span").text(deckStats[type] ?? 0);
  });
}

$(document).ready(async function () {
  const [qualities, presets, programs, matrixActions] = await Promise.all([
    loadQualities(),
    loadPresets(),
    loadPrograms(),
    loadMatrixActions()
  ]);
  
  // Global variable to store current deck stats
  let currentDeckStats = {};

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

  function getOrderedBaseStats(preset) {
    // If we have saved swapped stats, use those instead of the preset values
    if (saved.swappedStats) {
      return {
        attack: parseInt(saved.swappedStats.attack) || preset.attack,
        sleaze: parseInt(saved.swappedStats.sleaze) || preset.sleaze,
        dataProcessing: parseInt(saved.swappedStats.dataProcessing) || preset.dataProcessing,
        firewall: parseInt(saved.swappedStats.firewall) || preset.firewall
      };
    }
    
    // Otherwise use the preset values directly
    return {
      attack: preset.attack,
      sleaze: preset.sleaze,
      dataProcessing: preset.dataProcessing,
      firewall: preset.firewall
    };
  }

  function updateMatrixActions() {
    const basePreset = presets.find(p => p.name === $("#preset-selector").val()) || presets[0];
    
    // If currentDeckStats is empty, initialize it with values from getOrderedBaseStats
    if (Object.keys(currentDeckStats).length === 0) {
      currentDeckStats = getOrderedBaseStats(basePreset);
    }
    
    // Use currentDeckStats instead of calling getOrderedBaseStats every time
    const baseStats = { ...currentDeckStats };
    const selectedQualities = $(".quality-checkbox:checked").map((_, el) => {
      return qualities.find(q => q.name === $(el).val());
    }).get();
    const modifiedStats = applyImprovements({
      attributes: getAttributes(),
      skills: getSkills(),
      deckStats: { ...baseStats }
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

  function resetDeck(preset) {
    // Empty all populated program slots
    initProgramSlots(
      preset.rating || 6,
      [], // Empty array to clear all slots
      saveState
    );
    
    // Clear swapped deck stats by resetting to preset values
    currentDeckStats = {
      attack: preset.attack,
      sleaze: preset.sleaze,
      dataProcessing: preset.dataProcessing,
      firewall: preset.firewall
    };
    
    // Update deck stat labels to values from selected preset
    updateDeckStatLabels(currentDeckStats);
    
    // Rerun applyImprovements via updateMatrixActions
    updateMatrixActions();
    
    // Save the updated state
    saveState();
  }

  $("input, select").on("input change", function () {
    updateMatrixActions();
    saveState();
  });

  $("#preset-selector").on("change", function () {
    const selected = presets.find(p => p.name === $(this).val());
    if (selected) {
      resetDeck(selected);
    }
  });

  $("#reset-factory").on("click", function () {
    var currentPresetName = JSON.parse(localStorage.getItem("cyberdeckState") || "{}").selectedPreset
    var currentPreset = presets.find(p => p.name === currentPresetName);
    resetDeck(currentPreset)
    
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

      // No longer swapping data-type attributes
      // Labels remain fixed, only values change
      
      // Update the currentDeckStats with the swapped values
      const tempValue = currentDeckStats[sourceType];
      currentDeckStats[sourceType] = currentDeckStats[targetType];
      currentDeckStats[targetType] = tempValue;

      // Re-run updates to reflect changes
      updateMatrixActions();
      saveState();
    }, 150);
  });
});
