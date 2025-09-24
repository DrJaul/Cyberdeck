import {
  loadQualities,
  loadPresets,
  loadPrograms,
  loadMatrixActions
} from './dataLoader.js';

import {
  getAttributes,
  getSkills,
  applyImprovements,
  renderMatrixActions
} from './modifiers.js';

const choiceSelections = { qualities: {}, programs: {} };
const activePrograms = { slots: {}, dataMap: {} };
const currentDeckStats = {};

function openModal(modal) {
  if (!modal || !modal.length) return;
  modal.addClass("is-visible").attr("aria-hidden", "false");
}

function closeModal(modal) {
  if (!modal || !modal.length) return;
  modal.removeClass("is-visible").attr("aria-hidden", "true");
}

function handleChoiceSelection(itemType, itemName, itemData) {
  if (itemData.improvements?.type !== "choice") return false;
  
  const options = Object.keys(itemData.improvements.selections || {});
  if (!options.length) return false;
  
  const dropdown = $("#improvement-choice-dropdown").empty();
  options.forEach(option => dropdown.append($("<option>").val(option).text(option)));
  
  $("#improvement-choice-description").text(`Select an option for ${itemName}:`);
  const modal = $("#improvement-choice-modal");
  modal.data("itemInfo", { type: itemType, name: itemName, data: itemData });
  openModal(modal);

  return true;
}

function addActiveProgram(slotIndex, programName, programData) {
  if (!programName || !programData) return false;
  
  activePrograms.slots[slotIndex] = {
    name: programName,
    data: programData,
    selectedOption: choiceSelections.programs[programName] || null
  };
  
  return true;
}

function removeActiveProgram(slotIndex) {
  if (!activePrograms.slots[slotIndex]) return false;
  delete activePrograms.slots[slotIndex];
  return true;
}

function getActivePrograms() {
  return Object.values(activePrograms.slots).map(slot => ({
    ...slot.data,
    selectedOption: slot.selectedOption
  }));
}

let touchDragState = {
  isDragging: false,
  draggedItem: null,
  draggedItemType: null,
  draggedItemData: null,
  startX: 0,
  startY: 0,
  lastTouch: null
};

function resetTouchDragState() {
  touchDragState = {
    isDragging: false,
    draggedItem: null,
    draggedItemType: null,
    draggedItemData: null,
    startX: 0,
    startY: 0,
    lastTouch: null
  };
  
  removeDragGhost();
  $(".program-slot, .stat-box").removeClass("drag-over");
  $('body').removeClass('program-deactivate-zone');
  $('body').removeClass('grabbing-active');
}

function handleProgramActivation(programName, targetSlotIndex) {
  if (!programName || !activePrograms.dataMap[programName]) return false;
  
  addActiveProgram(targetSlotIndex, programName, activePrograms.dataMap[programName]);
  
  const programData = activePrograms.dataMap[programName];
  if (programData.improvements?.type === "choice" && !choiceSelections.programs[programName]) {
    handleChoiceSelection("programs", programName, programData);
  }
  
  return true;
}

function handleProgramMove(sourceSlotIndex, targetSlotIndex, sourceProgram, targetProgram) {
  if (sourceSlotIndex === targetSlotIndex) return false;
  
  const sourceSlot = $(`#program-slots .program-slot[data-slot="${sourceSlotIndex}"]`);
  const targetSlot = $(`#program-slots .program-slot[data-slot="${targetSlotIndex}"]`);
  
  if (targetProgram) {
    sourceSlot.text(targetProgram);
    if (activePrograms.dataMap[targetProgram]) {
      addActiveProgram(sourceSlotIndex, targetProgram, activePrograms.dataMap[targetProgram]);
    }
  } else {
    sourceSlot.text("");
    removeActiveProgram(sourceSlotIndex);
  }
  
  targetSlot.text(sourceProgram);
  
  if (activePrograms.dataMap[sourceProgram]) {
    handleProgramActivation(sourceProgram, targetSlotIndex);
  }
  
  return true;
}

function handleProgramDeactivation(slotIndex) {
  $(`#program-slots .program-slot[data-slot="${slotIndex}"]`).text("");
  removeActiveProgram(slotIndex);
  return true;
}

function handleStatSwap(sourceType, targetType) {
  if (sourceType === targetType) return false;
  
  const sourceBox = $(`#draggables .stat-box[data-type="${sourceType}"]`);
  const targetBox = $(`#draggables .stat-box[data-type="${targetType}"]`);
  const sourceVal = sourceBox.find("span").text();
  const targetVal = targetBox.find("span").text();
  
  sourceBox.addClass("swap");
  targetBox.addClass("swap");
  
  setTimeout(() => {
    sourceBox.find("span").text(targetVal);
    targetBox.find("span").text(sourceVal);
    sourceBox.removeClass("swap");
    targetBox.removeClass("swap");
    
    const tempValue = currentDeckStats[sourceType];
    currentDeckStats[sourceType] = currentDeckStats[targetType];
    currentDeckStats[targetType] = tempValue;
    
    updateMatrixActions();
    saveState();
  }, 150);
  
  return true;
}

function createDragGhost(text, x, y) {
  removeDragGhost();
  
  return $("<div>")
    .attr("id", "touch-drag-ghost")
    .text(text || "")
    .css({
      position: "fixed",
      top: (y - 20) + "px",
      left: (x - 40) + "px",
      background: "#333",
      color: "#fff",
      padding: "5px 10px",
      borderRadius: "3px",
      zIndex: 1000,
      opacity: 0.8,
      pointerEvents: "none"
    })
    .appendTo("body");
}

function updateDragGhost(x, y) {
  $("#touch-drag-ghost").css({
    top: (y - 20) + "px",
    left: (x - 40) + "px"
  });
}

function removeDragGhost() {
  $("#touch-drag-ghost").remove();
}

function makeProgramsDraggable(programs) {
  const container = $("#program-list").empty();
  
  activePrograms.dataMap = programs.reduce((map, prog) => {
    map[prog.name] = prog;
    return map;
  }, {});
  
  programs.forEach(prog => {
    $("<div>")
      .addClass("program-item")
      .attr("draggable", true)
      .text(prog.name)
      .off("dragstart")
      .on("dragstart", function(e) {
        e.originalEvent.dataTransfer.setData("text/plain", prog.name);
        e.originalEvent.dataTransfer.setData("source", "program-list");
        $('body').addClass('grabbing-active');
      })
      .off("touchstart")
      .on("touchstart", function(e) {
        const touch = e.originalEvent.touches[0];
        touchDragState = {
          isDragging: true,
          draggedItem: $(this),
          draggedItemType: "program",
          draggedItemData: prog.name,
          startX: touch.clientX,
          startY: touch.clientY,
          lastTouch: touch
        };
        
        createDragGhost(prog.name, touch.clientX, touch.clientY);
        $('body').addClass('grabbing-active');
        e.preventDefault();
      })
      .off("mouseenter mouseleave")
      .hover(
        e => $("#program-tooltip").text(prog.description).css({
          top: e.pageY + 10 + "px",
          left: e.pageX + 10 + "px"
        }).show(),
        () => $("#program-tooltip").hide()
      )
      .off("mousemove")
      .on("mousemove", e => $("#program-tooltip").css({
        top: e.pageY + 10 + "px",
        left: e.pageX + 10 + "px"
      }))
      .appendTo(container);
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
    choiceSelections
  };
  localStorage.setItem("cyberdeckState", JSON.stringify(state));
}

function updateDeckStatLabels(deckStats, originalDeckStats) {
  $("#draggables .stat-box").each(function() {
    const type = $(this).data("type");
    const originalValue = originalDeckStats[type] ?? 0;
    const modifiedValue = deckStats[type] ?? 0;
    
    $(this).find("span").text(originalValue);
    $(`#aug-${type}`).text(modifiedValue !== originalValue ? `(${modifiedValue})` : "");
  });
}

$(document).ready(async function() {
  const [qualities, presets, programs, matrixActions] = await Promise.all([
    loadQualities(),
    loadPresets(),
    loadPrograms(),
    loadMatrixActions()
  ]);

  const qualityMap = qualities.reduce((map, q) => {
    map[q.name] = q;
    return map;
  }, {});

  qualities.forEach(q => {
    $(`<label class="quality-checkbox">
      <input type="checkbox" value="${q.name}"> ${q.name}
    </label>`).appendTo($("#quality-list"));
  });
  
  $(document).on("change", ".quality-checkbox input[type='checkbox']", function() {
    const qualityName = $(this).val();
    const quality = qualityMap[qualityName];
    
    if ($(this).prop("checked")) {
      if (!handleChoiceSelection("qualities", qualityName, quality)) {
        updateMatrixActions();
      }
    } else {
      if (choiceSelections.qualities[qualityName]) {
        delete choiceSelections.qualities[qualityName];
        $(this).closest("label").contents().last().remove();
      }
      updateMatrixActions();
    }
    
    saveState();
  });

  presets.forEach(p => {
    $(`<option value="${p.name}">${p.name}</option>`).appendTo($("#preset-selector"));
  });

  makeProgramsDraggable(programs);

  const saved = JSON.parse(localStorage.getItem("cyberdeckState") || "{}");
  
  if (saved.attributes) {
    Object.entries(saved.attributes).forEach(([key, value]) => {
      $(`#attr-${key}`).val(value);
    });
  }
  
  if (saved.skills) {
    Object.entries(saved.skills).forEach(([key, value]) => {
      $(`#skill-${key}`).val(value);
    });
  }
  
  if (saved.selectedPreset) {
    $("#preset-selector").val(saved.selectedPreset).trigger("change");
    updateDeckStatsTitle();
  } else {
    updateDeckStatsTitle();
  }
  
  if (saved.qualities) {
    saved.qualities.forEach(q => $(`.quality-checkbox input[value="${q}"]`).prop("checked", true));
  }
  
  if (saved.choiceSelections) {
    Object.assign(choiceSelections, saved.choiceSelections);
    
    Object.entries(choiceSelections.qualities).forEach(([qualityName, selectedOption]) => {
      const checkbox = $(`.quality-checkbox input[value="${qualityName}"]`);
      if (checkbox.length && checkbox.prop("checked")) {
        checkbox.closest("label").append(` (${selectedOption})`);
      }
    });
  }

  const activePreset = presets.find(p => p.name === saved.selectedPreset) || presets[0];
  initProgramSlots(
    activePreset.programSlots || 6,
    saved.programSlots || []
  );

  function getOrderedBaseStats(preset) {
    if (!preset) return { attack: 0, sleaze: 0, dataProcessing: 0, firewall: 0 };
    
    if (saved.swappedStats) {
      return {
        attack: parseInt(saved.swappedStats.attack, 10) || preset.attack || 0,
        sleaze: parseInt(saved.swappedStats.sleaze, 10) || preset.sleaze || 0,
        dataProcessing: parseInt(saved.swappedStats.dataProcessing, 10) || preset.dataProcessing || 0,
        firewall: parseInt(saved.swappedStats.firewall, 10) || preset.firewall || 0
      };
    }
    
    return {
      attack: preset.attack || 0,
      sleaze: preset.sleaze || 0,
      dataProcessing: preset.dataProcessing || 0,
      firewall: preset.firewall || 0
    };
  }

  function updateDeckStatsTitle() {
    $("#deck-stats h3").text($("#preset-selector").val() || "Drag to Reassign Stats");
  }

  function collectItems() {
    const items = [];
    
    $(".quality-checkbox input[type='checkbox']:checked").each((_, el) => {
      const qualityName = $(el).val();
      if (!qualityName) return;
      
      const quality = qualityMap[qualityName];
      if (!quality) return;
      
      if (quality.improvements?.type === "choice" && choiceSelections.qualities[qualityName]) {
        items.push({
          ...quality,
          selectedOption: choiceSelections.qualities[qualityName]
        });
      } else {
        items.push(quality);
      }
    });
    
    items.push(...getActivePrograms());
    return items;
  }

  // Make updateMatrixActions globally accessible
  window.updateMatrixActions = function() {
    const presetName = $("#preset-selector").val();
    const basePreset = presets.find(p => p.name === presetName) || presets[0];
    if (!basePreset) return;
    
    if (!Object.keys(currentDeckStats).length) {
      Object.assign(currentDeckStats, getOrderedBaseStats(basePreset));
    }
    
    const allItems = collectItems();
    const originalDeckStats = { ...currentDeckStats };
    
    const modifiedStats = applyImprovements({
      attributes: getAttributes(),
      skills: getSkills(),
      deckStats: { ...currentDeckStats }
    }, allItems);
    
    if (!modifiedStats) return;
    
    updateNotesDisplay(modifiedStats.notes);
    updateDeckStatLabels(modifiedStats.deckStats, originalDeckStats);
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
  
  function updateNotesDisplay(notes) {
    const notesList = $("#notes-list");
    
    if (notes?.length) {
      notesList.empty();
      notes.forEach(note => {
        $("<li>").html(`<strong>${note.source}:</strong> ${note.text}`).appendTo(notesList);
      });
      $("#deck-notes").show();
    } else {
      $("#deck-notes").hide();
    }
  }

  updateMatrixActions();

  function resetDeck(preset) {
    initProgramSlots(preset.rating || 6, []);
    activePrograms.slots = {};
    
    Object.assign(currentDeckStats, {
      attack: preset.attack,
      sleaze: preset.sleaze,
      dataProcessing: preset.dataProcessing,
      firewall: preset.firewall
    });
    
    updateDeckStatLabels(currentDeckStats, currentDeckStats);
    updateMatrixActions();
    saveState();
  }

  $("input[id^='attr-'], input[id^='skill-']").on("change", function() {
    updateMatrixActions();
    saveState();
  });

  $("#preset-selector").on("change", function() {
    const selected = presets.find(p => p.name === $(this).val());
    if (selected) {
      resetDeck(selected);
      updateDeckStatsTitle();
    }
  });

  $("#reset-factory").on("click", function() {
    const currentPresetName = JSON.parse(localStorage.getItem("cyberdeckState") || "{}").selectedPreset;
    const currentPreset = presets.find(p => p.name === currentPresetName);
    resetDeck(currentPreset);
    updateDeckStatsTitle();
  });

  function isMobileDevice() {
    return window.innerWidth <= 768;
  }

  function handlePanelToggle(panelToToggle, otherPanel) {
    const $panelToToggle = $(panelToToggle);
    const $otherPanel = $(otherPanel);
    
    if (isMobileDevice() && !$panelToToggle.hasClass("open")) {
      $otherPanel.removeClass("open");
    }
    
    $panelToToggle.toggleClass("open");
  }

  $("#left-toggle").on("click", () => handlePanelToggle("#left-panel", "#right-panel"));
  $("#right-toggle").on("click", () => handlePanelToggle("#right-panel", "#left-panel"));

  $(window).on("resize.panelCheck", function() {
    if (isMobileDevice() && $("#left-panel").hasClass("open") && $("#right-panel").hasClass("open")) {
      $("#right-panel").removeClass("open");
    }
  });

  $("#about-link").on("click", function(e) {
    e.preventDefault();
    openModal($("#about-modal"));
  });

  $("#contact-link").on("click", function(e) {
    e.preventDefault();
    openModal($("#contact-modal"));
  });

  $(document).on("click", ".modal-close", function() {
    const targetId = $(this).data("modalTarget");
    if (targetId) {
      closeModal($(`#${targetId}`));
    }
  });

  $(document).on("click", ".modal", function(e) {
    const modal = $(this);
    if (!modal.data("dismissable")) return;
    if (modal.is(e.target)) {
      closeModal(modal);
    }
  });

  $(document).on("keyup.modal", function(e) {
    if (e.key !== "Escape") return;
    $(".modal.is-visible").each(function() {
      const modal = $(this);
      if (modal.data("dismissable")) {
        closeModal(modal);
      }
    });
  });

  $("#improvement-choice-confirm").on("click", function() {
    const modal = $("#improvement-choice-modal");
    const itemInfo = modal.data("itemInfo");
    const selectedOption = $("#improvement-choice-dropdown").val();
    
    if (itemInfo && selectedOption) {
      choiceSelections[itemInfo.type][itemInfo.name] = selectedOption;
      
      if (itemInfo.type === "qualities") {
        const checkbox = $(`.quality-checkbox input[value="${itemInfo.name}"]`);
        const label = checkbox.closest("label");
        
        label.contents().filter(function() {
          return this.nodeType === 3 && this.textContent.includes("(");
        }).remove();
        
        label.append(` (${selectedOption})`);
      } else if (itemInfo.type === "programs") {
        $(".program-slot").each(function() {
          const slotIndex = $(this).data("slot-index");
          if ($(this).text().trim() === itemInfo.name) {
            $(this).text(`${itemInfo.name} (${selectedOption})`);
            
            if (activePrograms.slots[slotIndex]) {
              activePrograms.slots[slotIndex].selectedOption = selectedOption;
            }
          }
        });
      }
      
      updateMatrixActions();
      saveState();
    }
    
    closeModal(modal);
  });

  $("#improvement-choice-cancel").on("click", function() {
    const modal = $("#improvement-choice-modal");
    const itemInfo = modal.data("itemInfo");
    
    if (itemInfo?.type === "qualities" && !choiceSelections.qualities[itemInfo.name]) {
      $(`.quality-checkbox input[value="${itemInfo.name}"]`).prop("checked", false);
    }
    
    closeModal(modal);
    updateMatrixActions();
    saveState();
  });

  function initProgramSlots(slotCount, savedSlots) {
    const container = $("#program-slots").empty();
    let currentDragSlot = null;
    
    function setupDragEvents() {
      $(document)
        .on("dragover", function(e) {
          e.preventDefault();
          if (currentDragSlot !== null) {
            $('body').toggleClass('program-deactivate-zone', !$(e.target).closest('.program-slot').length);
          }
        })
        .on("drop", function(e) {
          e.preventDefault();
          $('body').removeClass('program-deactivate-zone');
          
          if (currentDragSlot !== null && !$(e.target).closest('.program-slot').length) {
            handleProgramDeactivation(currentDragSlot);
            updateMatrixActions();
            saveState();
            currentDragSlot = null;
          }
        })
        .on("dragend", function() {
          $('body').removeClass('program-deactivate-zone');
          $('body').removeClass('grabbing-active');
          currentDragSlot = null;
        })
        .on("touchmove", function(e) {
          if (!touchDragState.isDragging || !touchDragState.lastTouch) return;
          
          const touch = e.originalEvent.touches[0];
          updateDragGhost(touch.clientX, touch.clientY);
          
          const elementsUnderTouch = document.elementsFromPoint(touch.clientX, touch.clientY);
          $(".program-slot, .stat-box").removeClass("drag-over");
          $('body').removeClass('program-deactivate-zone');
          
          if (touchDragState.draggedItemType === "program" || touchDragState.draggedItemType === "slot") {
            const programSlotUnderTouch = $(elementsUnderTouch).filter(".program-slot");
            
            if (programSlotUnderTouch.length) {
              programSlotUnderTouch.addClass("drag-over");
            } else if (touchDragState.draggedItemType === "slot") {
              $('body').addClass('program-deactivate-zone');
            }
          } else if (touchDragState.draggedItemType === "stat") {
            const statBoxUnderTouch = $(elementsUnderTouch).filter(".stat-box");
            if (statBoxUnderTouch.length) {
              statBoxUnderTouch.addClass("drag-over");
            }
          }
          
          touchDragState.lastTouch = touch;
          e.preventDefault();
        })
        .on("touchend touchcancel", function() {
          if (!touchDragState.isDragging || !touchDragState.lastTouch) return;
          
          const elementsUnderTouch = document.elementsFromPoint(
            touchDragState.lastTouch.clientX, 
            touchDragState.lastTouch.clientY
          );
          
          if (touchDragState.draggedItemType === "program" || touchDragState.draggedItemType === "slot") {
            const programSlotUnderTouch = $(elementsUnderTouch).filter(".program-slot");
            
            if (programSlotUnderTouch.length) {
              const targetSlotIndex = parseInt(programSlotUnderTouch.attr("data-slot") || "0", 10);
              const existingProgram = programSlotUnderTouch.text().trim();
              
              if (touchDragState.draggedItemType === "program" && touchDragState.draggedItemData) {
                programSlotUnderTouch.text(touchDragState.draggedItemData);
                handleProgramActivation(touchDragState.draggedItemData, targetSlotIndex);
              } else if (touchDragState.draggedItemType === "slot") {
                const sourceSlotIndex = parseInt(touchDragState.draggedItemData || "0", 10);
                const sourceSlot = $(`#program-slots .program-slot[data-slot="${sourceSlotIndex}"]`);
                const sourceProgram = sourceSlot.text().trim();
                
                if (sourceProgram) {
                  handleProgramMove(sourceSlotIndex, targetSlotIndex, sourceProgram, existingProgram);
                }
              }
            } else if (touchDragState.draggedItemType === "slot") {
              handleProgramDeactivation(parseInt(touchDragState.draggedItemData || "0", 10));
            }
            
            updateMatrixActions();
            saveState();
          } else if (touchDragState.draggedItemType === "stat" && touchDragState.draggedItemData) {
            const statBoxUnderTouch = $(elementsUnderTouch).filter(".stat-box");
            
            if (statBoxUnderTouch.length) {
              const targetType = statBoxUnderTouch.data("type");
              if (targetType) {
                handleStatSwap(touchDragState.draggedItemData, targetType);
              }
            }
          }
          
          resetTouchDragState();
        });
    }
    
    setupDragEvents();
    
    for (let i = 0; i < slotCount; i++) {
      const slot = $("<div>")
        .addClass("program-slot")
        .attr("data-slot", i)
        .attr("data-slot-index", i)
        .attr("draggable", true)
        .text(savedSlots[i] || "")
        .on("dragstart", function(e) {
          const content = $(this).text().trim();
          if (!content) {
            e.preventDefault();
            return false;
          }
          
          e.originalEvent.dataTransfer.setData("text/plain", content);
          currentDragSlot = $(this).attr("data-slot");
          e.originalEvent.dataTransfer.effectAllowed = "move";
          $('body').addClass('grabbing-active');
        })
        .on("touchstart", function(e) {
          const content = $(this).text().trim();
          if (!content) return false;
          
          const touch = e.originalEvent.touches[0];
          touchDragState = {
            isDragging: true,
            draggedItem: $(this),
            draggedItemType: "slot",
            draggedItemData: $(this).attr("data-slot"),
            startX: touch.clientX,
            startY: touch.clientY,
            lastTouch: touch
          };
          
          createDragGhost(content, touch.clientX, touch.clientY);
          $('body').addClass('grabbing-active');
          e.preventDefault();
        })
        .on("dragover", function(e) {
          e.preventDefault();
          $(this).addClass("drag-over");
        })
        .on("dragleave", function() {
          $(this).removeClass("drag-over");
        })
        .on("drop", function(e) {
          e.preventDefault();
          $(this).removeClass("drag-over");
          $('body').removeClass('program-deactivate-zone');
          $('body').removeClass('grabbing-active');

          const draggedText = e.originalEvent.dataTransfer.getData("text/plain");
          if (!draggedText) return;
          
          const targetSlotIndex = parseInt($(this).attr("data-slot"));
          
          if (currentDragSlot !== null) {
            handleProgramMove(
              parseInt(currentDragSlot), 
              targetSlotIndex, 
              draggedText, 
              $(this).text()
            );
          } else {
            $(this).text(draggedText);
            handleProgramActivation(draggedText, targetSlotIndex);
          }
          
          updateMatrixActions();
          saveState();
          currentDragSlot = null;
        });
      
      container.append(slot);
      
      if (savedSlots[i]) {
        const programData = activePrograms.dataMap[savedSlots[i]];
        if (programData) {
          addActiveProgram(i, savedSlots[i], programData);
        }
      }
    }
  }

  $("#draggables .stat-box")
    .attr("draggable", true)
    .on("dragstart", function(e) {
      e.originalEvent.dataTransfer.setData("text/plain", $(this).data("type"));
      $('body').addClass('grabbing-active');
    })
    .on("touchstart", function(e) {
      const touch = e.originalEvent.touches[0];
      touchDragState = {
        isDragging: true,
        draggedItem: $(this),
        draggedItemType: "stat",
        draggedItemData: $(this).data("type"),
        startX: touch.clientX,
        startY: touch.clientY,
        lastTouch: touch
      };
      
      createDragGhost($(this).find("span").text(), touch.clientX, touch.clientY);
      $('body').addClass('grabbing-active');
      e.preventDefault();
    })
    .on("dragover", function(e) {
      e.preventDefault();
      $(this).addClass("drag-over");
    })
    .on("dragleave", function() {
      $(this).removeClass("drag-over");
    })
    .on("drop", function(e) {
      e.preventDefault();
      $(this).removeClass("drag-over");
      $('body').removeClass('grabbing-active');
      handleStatSwap(
        e.originalEvent.dataTransfer.getData("text/plain"),
        $(this).data("type")
      );
    });
});
