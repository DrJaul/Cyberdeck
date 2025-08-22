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
  
  // Track which slot is being dragged
  let currentDragSlot = null;
  
  // Add document-level handlers for drag and drop
  $(document).off("dragover").on("dragover", function(e) {
    // Always prevent default to allow drops anywhere on the document
    e.preventDefault();
    
    // Add visual indication that dropping outside will deactivate the program
    if (currentDragSlot !== null) {
      // Check if we're over a program slot
      const isOverProgramSlot = $(e.target).closest('.program-slot').length > 0;
      if (!isOverProgramSlot) {
        // Visual indication that dropping here will deactivate
        $('body').addClass('program-deactivate-zone');
      } else {
        $('body').removeClass('program-deactivate-zone');
      }
    }
  });
  
  $(document).off("drop").on("drop", function(e) {
    e.preventDefault();
    $('body').removeClass('program-deactivate-zone');
    
    // Only process if we have a current drag operation from a program slot
    if (currentDragSlot !== null) {
      // Check if we're dropping on a program slot
      const targetSlot = $(e.target).closest('.program-slot');
      
      // If not dropping on a program slot, deactivate the program
      if (targetSlot.length === 0) {
        // Clear the source slot
        $(`#program-slots .program-slot[data-slot="${currentDragSlot}"]`).text("");
        onProgramChange(); // Update backend state
      }
      
      // Reset tracking
      currentDragSlot = null;
    }
  });
  
  // Handle drag end to clean up visual states
  $(document).off("dragend").on("dragend", function() {
    $('body').removeClass('program-deactivate-zone');
    currentDragSlot = null;
  });
  
  for (let i = 0; i < slotCount; i++) {
    const slot = $("<div>")
      .addClass("program-slot")
      .attr("data-slot", i)
      .attr("draggable", true)
      .text(savedSlots[i] || "")
      .on("dragstart", function(e) {
        const content = $(this).text().trim();
        // Only make it draggable if it has content
        if (content === "") {
          e.preventDefault();
          return false;
        }
        
        // Set data for the drag operation
        e.originalEvent.dataTransfer.setData("text/plain", content);
        
        // Track which slot is being dragged using a variable instead of dataTransfer
        currentDragSlot = $(this).attr("data-slot");
        
        // Set drag image and effects
        e.originalEvent.dataTransfer.effectAllowed = "move";
      })
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
        $('body').removeClass('program-deactivate-zone');

        const draggedText = e.originalEvent.dataTransfer.getData("text/plain");
        const $existing = $(this).text();
        const targetSlotIndex = $(this).attr("data-slot");
        
        // Handle drop from program list or another slot
        if (draggedText) {
          // If we're dropping from another program slot (tracked by currentDragSlot)
          if (currentDragSlot !== null) {
            const sourceSlot = $(`#program-slots .program-slot[data-slot="${currentDragSlot}"]`);
            
            // If dropping to a different slot
            if (currentDragSlot !== targetSlotIndex) {
              if ($existing) {
                // Swap programs between slots
                sourceSlot.text($existing);
              } else {
                // Move to empty slot, clear source
                sourceSlot.text("");
              }
              
              // Set the program in the target slot
              $(this).text(draggedText);
            }
          } else {
            // Dropping from program list, just set the text
            $(this).text(draggedText);
          }
          
          // Update backend state
          onProgramChange();
          
          // Reset tracking
          currentDragSlot = null;
        }
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
