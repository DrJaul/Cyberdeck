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

// Store selected options for choice-type qualities and programs
const choiceSelections = {
  qualities: {},
  programs: {}
};

// Store active programs data for fast access
const activePrograms = {
  slots: {},
  dataMap: {}
};

// Function to handle choice-type qualities and programs
function handleChoiceSelection(itemType, itemName, itemData) {
  if (itemData.improvements && itemData.improvements.type === "choice") {
    const selections = itemData.improvements.selections;
    const options = Object.keys(selections);
    
    if (options.length > 0) {
      // Populate the dropdown with options
      const dropdown = $("#improvement-choice-dropdown");
      dropdown.empty();
      
      options.forEach(option => {
        dropdown.append($("<option>").val(option).text(option));
      });
      
      // Set description
      $("#improvement-choice-description").text(
        `Select an option for ${itemName}:`
      );
      
      // Store the current item info for use in the confirm handler
      $("#improvement-choice-modal").data("itemInfo", {
        type: itemType,
        name: itemName,
        data: itemData
      });
      
      // Show the modal
      $("#improvement-choice-modal").show();
      return true; // Indicate that we're handling a choice
    }
  }
  return false; // Not a choice-type or no options
}

// Add a program to the active programs data structure
function addActiveProgram(slotIndex, programName, programData) {
  if (!programName || !programData) return false;
  
  // Store program in the slot
  activePrograms.slots[slotIndex] = {
    name: programName,
    data: programData,
    selectedOption: choiceSelections.programs[programName] || null
  };
  
  return true;
}

// Remove a program from the active programs data structure
function removeActiveProgram(slotIndex) {
  if (!activePrograms.slots[slotIndex]) return false;
  
  // Remove program from the slot
  delete activePrograms.slots[slotIndex];
  return true;
}

// Get all active programs as an array of program data objects
function getActivePrograms() {
  return Object.values(activePrograms.slots).map(slot => {
    return {
      ...slot.data,
      selectedOption: slot.selectedOption
    };
  });
}

function makeProgramsDraggable(programs) {
  const container = $("#program-list");
  container.empty();
  
  // Build program data map for quick lookups
  activePrograms.dataMap = programs.reduce((map, prog) => {
    map[prog.name] = prog;
    return map;
  }, {});
  
  programs.forEach(prog => {
    const item = $("<div>")
      .addClass("program-item")
      .attr("draggable", true)
      .text(prog.name)
      .off("dragstart")
      .on("dragstart", function (e) {
        e.originalEvent.dataTransfer.setData("text/plain", prog.name);
        e.originalEvent.dataTransfer.setData("source", "program-list");
      })
      .off("mouseenter mouseleave")
      .hover(function (e) {
        $("#program-tooltip").text(prog.description).css({
          top: e.pageY + 10 + "px",
          left: e.pageX + 10 + "px"
        }).show();
      }, function () {
        $("#program-tooltip").hide();
      })
      .off("mousemove")
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
    qualities: $(".quality-checkbox input[type='checkbox']:checked").map((_, el) => $(el).val()).get(),
    selectedPreset: $("#preset-selector").val(),
    programSlots: $(".program-slot").map((_, el) => $(el).text()).get(),
    swappedStats: {
      attack: $("#draggables .stat-box[data-type='attack'] span").text(),
      sleaze: $("#draggables .stat-box[data-type='sleaze'] span").text(),
      dataProcessing: $("#draggables .stat-box[data-type='dataProcessing'] span").text(),
      firewall: $("#draggables .stat-box[data-type='firewall'] span").text()
    },
    choiceSelections: choiceSelections
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

  // Create a map of quality names to their data for easy lookup
  const qualityMap = qualities.reduce((map, q) => {
    map[q.name] = q;
    return map;
  }, {});

  const container = $("#quality-list");
  qualities.forEach(q => {
    const checkbox = $(`<label class="quality-checkbox">
        <input type="checkbox" value="${q.name}"> ${q.name}
      </label>`);
    container.append(checkbox);
  });
  
  // Quality Checkbox event listener
  var qualityCheckboxSelector = ".quality-checkbox input[type='checkbox']"
  $(qualityCheckboxSelector).off("change");
  $(qualityCheckboxSelector).on("change", function() {
    const qualityName = $(this).val();
    const quality = qualityMap[qualityName];
    
    if ($(this).prop("checked")) {
      if (handleChoiceSelection("qualities", qualityName, quality)) {
        // If it's a choice-type quality, the modal will handle the rest
      } else {
        // Not a choice-type quality, update matrix actions immediately
        updateMatrixActions();
      }
    } else {
      // Quality was deactivated, remove any selected option
      if (choiceSelections.qualities[qualityName]) {
        delete choiceSelections.qualities[qualityName];
        
        // Update the label to remove the selected option
        const label = $(this).closest("label");
        label.contents().last().remove(); // Remove the text node with the selected option
      }
      
      updateMatrixActions();
    }
    
    saveState();
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
  } else {
    // If no preset was saved, update the title with the default (empty) value
    updateDeckStatsTitle();
  }
  if (saved.qualities) {
    saved.qualities.forEach(q => $(`.quality-checkbox input[value="${q}"]`).prop("checked", true));
  }
  
  // Load saved choice selections
  if (saved.choiceSelections) {
    Object.assign(choiceSelections, saved.choiceSelections);
    
    // Update labels for qualities with selections
    for (const qualityName in choiceSelections.qualities) {
      const selectedOption = choiceSelections.qualities[qualityName];
      const checkbox = $(`.quality-checkbox input[value="${qualityName}"]`);
      if (checkbox.length && checkbox.prop("checked")) {
        const label = checkbox.closest("label");
        label.append(` (${selectedOption})`);
      }
    }
  }

  const activePreset = presets.find(p => p.name === saved.selectedPreset) || presets[0];
  initProgramSlots(
    activePreset.programSlots || 6,
    saved.programSlots || [],
    function(slotIndex, programName) {
      // Custom callback for program slot changes
      if (programName) {
        // Program was added to a slot
        const programData = activePrograms.dataMap[programName];
        if (programData) {
          // Add to active programs
          addActiveProgram(slotIndex, programName, programData);
          
          // Check if it's a choice-type program
          if (programData.improvements?.type === "choice" && 
              !choiceSelections.programs[programName]) {
            handleChoiceSelection("programs", programName, programData);
          }
        }
      } else {
        // Program was removed from a slot
        removeActiveProgram(slotIndex);
      }
      
      // Update the UI and save state
      updateMatrixActions();
      saveState();
    }
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

  // Function to update the deck stats title with the selected preset name
  function updateDeckStatsTitle() {
    const presetName = $("#preset-selector").val();
    if (presetName) {
      $("#deck-stats h3").text(presetName);
    } else {
      $("#deck-stats h3").text("Drag to Reassign Stats");
    }
  }

  // Collect items (qualities/programs) with their selected options
  function collectItems() {
    const items = [];
    
    // Add selected qualities
    $(".quality-checkbox input[type='checkbox']:checked").each((_, el) => {
      const qualityName = $(el).val();
      const quality = qualityMap[qualityName];
      
      if (!quality) return;
      
      // For choice-type qualities, add the selected option
      if (quality.improvements?.type === "choice" && choiceSelections.qualities[qualityName]) {
        items.push({
          ...quality,
          selectedOption: choiceSelections.qualities[qualityName]
        });
      } else {
        items.push(quality);
      }
    });
    
    // Add active programs from our optimized data structure
    const activeProgs = getActivePrograms();
    items.push(...activeProgs);
    
    return items;
  }

  function updateMatrixActions() {
    const basePreset = presets.find(p => p.name === $("#preset-selector").val()) || presets[0];
    
    // Initialize deck stats if needed
    if (Object.keys(currentDeckStats).length === 0) {
      currentDeckStats = getOrderedBaseStats(basePreset);
    }
    
    // Collect all active items (qualities and programs)
    const allItems = collectItems();
    
    // Apply improvements to get modified stats
    const modifiedStats = applyImprovements({
      attributes: getAttributes(),
      skills: getSkills(),
      deckStats: { ...currentDeckStats }
    }, allItems);

    // Update notes display
    updateNotesDisplay(modifiedStats.notes);
    
    // Update UI with modified stats
    updateDeckStatLabels(modifiedStats.deckStats);
    renderMatrixActions(
      matrixActions,
      modifiedStats.attributes,
      modifiedStats.skills,
      modifiedStats.deckStats,
      modifiedStats.matrixActions || {},
      modifiedStats.replacements || [],
      modifiedStats.matrixActionDetails || {},
      modifiedStats.globalMatrixActionDetails || []
    );
  }
  
  // Update the notes display based on improvement notes
  function updateNotesDisplay(notes) {
    const notesList = $("#notes-list");
    
    if (notes?.length > 0) {
      notesList.empty();
      
      notes.forEach(note => {
        const noteItem = $("<li>").html(`<strong>${note.source}:</strong> ${note.text}`);
        notesList.append(noteItem);
      });
      
      $("#deck-notes").show();
    } else {
      $("#deck-notes").hide();
    }
  }

  updateMatrixActions();

  function resetDeck(preset) {
    // Empty all populated program slots
    initProgramSlots(
      preset.rating || 6,
      [], // Empty array to clear all slots
      function() {
        // Clear active programs data structure
        activePrograms.slots = {};
      }
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

  $("input[id^='attr-'], input[id^='skill-']").off("change");
  $("input[id^='attr-'], input[id^='skill-']").on("change", function () {
    updateMatrixActions();
    saveState();
  });

  $("#preset-selector").off("change");
  $("#preset-selector").on("change", function () {
    const selectedPreset = $(this).val();
    const selected = presets.find(p => p.name === selectedPreset);
    if (selected) {
      resetDeck(selected);
      // Update the title with the selected preset name
      updateDeckStatsTitle();
    }
  });

  $("#reset-factory").off("click");
  $("#reset-factory").on("click", function () {
    var currentPresetName = JSON.parse(localStorage.getItem("cyberdeckState") || "{}").selectedPreset
    var currentPreset = presets.find(p => p.name === currentPresetName);
    resetDeck(currentPreset);
    // Update the title with the current preset name
    updateDeckStatsTitle();
  });

  $("#left-toggle").off("click");
  $("#left-toggle").on("click", function () {
    $("#left-panel").toggleClass("open");
  });

  $("#right-toggle").off("click");
  $("#right-toggle").on("click", function () {
    $("#right-panel").toggleClass("open");
  });
  
  // Set up modal handlers
  $("#improvement-choice-confirm").off("click");
  $("#improvement-choice-confirm").on("click", function() {
    const modal = $("#improvement-choice-modal");
    const itemInfo = modal.data("itemInfo");
    const selectedOption = $("#improvement-choice-dropdown").val();
    
    if (itemInfo && selectedOption) {
      // Store the selection
      choiceSelections[itemInfo.type][itemInfo.name] = selectedOption;
      
      // Update the label with the selected option
      if (itemInfo.type === "qualities") {
        const checkbox = $(`.quality-checkbox input[value="${itemInfo.name}"]`);
        const label = checkbox.closest("label");
        
        // Remove any existing selection text
        label.contents().filter(function() {
          return this.nodeType === 3 && this.textContent.includes("(");
        }).remove();
        
        // Add the new selection text
        label.append(` (${selectedOption})`);
      } else if (itemInfo.type === "programs") {
        // For programs, we need to find the slot with this program
        const slots = $(".program-slot");
        slots.each(function() {
          const slotIndex = $(this).data("slot-index");
          if ($(this).text().trim() === itemInfo.name) {
            // Update the slot text to include the selection
            $(this).text(`${itemInfo.name} (${selectedOption})`);
            
            // Update the active program data
            if (activePrograms.slots[slotIndex]) {
              activePrograms.slots[slotIndex].selectedOption = selectedOption;
            }
          }
        });
      }
      
      // Update matrix actions with the new selection
      updateMatrixActions();
      saveState();
    }
    
    // Hide the modal
    modal.hide();
  });
  
  $("#improvement-choice-cancel").off("click");
  $("#improvement-choice-cancel").on("click", function() {
    const modal = $("#improvement-choice-modal");
    const itemInfo = modal.data("itemInfo");
    
    // If canceling a new quality selection, uncheck the checkbox
    if (itemInfo && itemInfo.type === "qualities" && !choiceSelections.qualities[itemInfo.name]) {
      $(`.quality-checkbox input[value="${itemInfo.name}"]`).prop("checked", false);
    }
    
    // Hide the modal
    modal.hide();
    
    // Update matrix actions and save state
    updateMatrixActions();
    saveState();
  });

  // Add drag-swap logic
  $("#draggables .stat-box").off("dragstart");
  $("#draggables .stat-box").on("dragstart", function (e) {
    e.originalEvent.dataTransfer.setData("text/plain", $(this).data("type"));
  });

  $("#draggables .stat-box").off("dragover");
  $("#draggables .stat-box").on("dragover", function (e) {
    e.preventDefault();
    $(this).addClass("drag-over");
  });

  $("#draggables .stat-box").off("dragleave");
  $("#draggables .stat-box").on("dragleave", function () {
    $(this).removeClass("drag-over");
  });

  $("#draggables .stat-box").off("drop");
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
