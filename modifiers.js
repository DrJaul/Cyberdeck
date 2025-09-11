export function getAttributes() {
  return {
    logic: parseInt($("#attr-logic").val()) || 0,
    intuition: parseInt($("#attr-intuition").val()) || 0,
    willpower: parseInt($("#attr-willpower").val()) || 0
  };
}

export function getSkills() {
  return {
    hacking: parseInt($("#skill-hacking").val()) || 0,
    computer: parseInt($("#skill-computer").val()) || 0,
    electronicWarfare: parseInt($("#skill-electronicWarfare").val()) || 0,
    cybercombat: parseInt($("#skill-cybercombat").val()) || 0,
    software: parseInt($("#skill-software").val()) || 0,
    hardware: parseInt($("#skill-hardware").val()) || 0
  };
}

export function applyImprovements(baseStats, items = []) {
  const modified = JSON.parse(JSON.stringify(baseStats)); // deep clone

  if (!modified.attributes) modified.attributes = {};
  if (!modified.skills) modified.skills = {};
  if (!modified.deckStats) modified.deckStats = {};
  if (!modified.matrixActions) modified.matrixActions = {};
  if (!modified.matrixActionDetails) modified.matrixActionDetails = {}; // Store details about each improvement
  if (!modified.replacements) modified.replacements = [];
  if (!modified.notes) modified.notes = []; // Array to store notes

  items.forEach(item => {
    if (item.improvements && item.improvements.selections) {
      const type = item.improvements.type || "static";
      const selections = item.improvements.selections;
      
      // Determine which selection to use
      let selectionKey = "default";
      
      // If this is a choice-type item with a selected option, use that instead
      if (type === "choice" && item.selectedOption && selections[item.selectedOption]) {
        selectionKey = item.selectedOption;
      }
      
      const selectionArray = selections[selectionKey] || [];

      selectionArray.forEach(entry => {
        if (type === "replacement") {
          // Handle replacement-type improvements
          if (entry.formula && Array.isArray(entry.formula) && entry.formula.length >= 2) {
            modified.replacements.push({
              from: entry.formula[0],
              to: entry.formula[1],
              affects: entry.affects
            });
          }
        } else if (type === "static" || type === "choice") {
          // Handle static-type and choice-type improvements 
          for (const [target, value] of Object.entries(entry)) {
            if (target === "affects" || target === "formula") continue;
            const targetGroup = entry.affects;
            switch (targetGroup) {
              case "attribute":
                if (!modified.attributes[target]) modified.attributes[target] = 0;
                modified.attributes[target] += value;
                break;
              case "skill":
                if (!modified.skills[target]) modified.skills[target] = 0;
                modified.skills[target] += value;
                break;
              case "deckStat":
                if (!modified.deckStats[target]) modified.deckStats[target] = 0;
                modified.deckStats[target] += value;
                break;
              case "notes":
                // Handle improvements that affect notes
                // For notes, the value is the text to be displayed
                if (value && typeof value === 'string') {
                  // Get the display name (include the selected option for choice-type items)
                  let displayName = item.name;
                  if (type === "choice" && item.selectedOption) {
                    displayName = `${item.name} (${item.selectedOption})`;
                  }
                  
                  // Add the note with source information
                  modified.notes.push({
                    text: value,
                    source: displayName
                  });
                }
                break;
              case "matrixAction":
                // Check if this improvement targets a specific matrix action by ID
                const matrixActionId = entry.matrixActionId;
                
                // Track both the total value and the individual contributions
              
                // This improvement targets a specific matrix action by ID
                // Store under both the original ID and a normalized version to improve matching
                const targets = [matrixActionId];
                
                // If it's a string ID, also store under a normalized version (lowercase, no spaces)
                if (typeof matrixActionId === 'string') {
                  console.warn("matrix action id is string")
                }
                
                // Store the improvement under all target keys
                targets.forEach(targetId => {
                  if (!modified.matrixActions[targetId]) modified.matrixActions[targetId] = 0;
                  modified.matrixActions[targetId] += value;
                  
                  // Store details about this improvement for the formula display
                  if (!modified.matrixActionDetails[targetId]) {
                    modified.matrixActionDetails[targetId] = [];
                  }
                  
                  // Get the display name (include the selected option for choice-type items)
                  let displayName = item.name;
                  if (type === "choice" && item.selectedOption) {
                    displayName = `${item.name} (${item.selectedOption})`;
                  }
                  
                  modified.matrixActionDetails[targetId].push({
                    name: displayName,
                    value: value,
                    type: item.type || (item.rating ? "program" : "quality") // Try to determine if it's a program or quality
                  });
                });
              
                break;
            }
          }
        } else {
          // Handle unknown improvement types 
          console.warn(`Unknown improvement type: ${type}`);
        }
      });
    }
  });

  return modified;
}

export function renderMatrixActions(actions, attributes, skills, baseStats, qualityMods, replacements = [], matrixActionDetails = {}) {
  const table = $("#matrix-actions-table tbody");
  table.empty();

  // Map from limit names to baseStats keys
  const limitToStatMap = {
    "data processing": "dataProcessing",
    "attack": "attack",
    "sleaze": "sleaze",
    "firewall": "firewall"
  };

  // Use matrixActionDetails from the modified stats if available
  if (!matrixActionDetails && arguments.length >= 7) {
    matrixActionDetails = arguments[6];
  }

  actions.forEach(action => {
    const row = $("<tr>");

    const limitKey = (action.limit || "").toLowerCase();
    const statKey = limitToStatMap[limitKey] || limitKey;
    const baseLimit = baseStats[statKey] ?? 0;
    const limitCell = action.limit ? `${action.limit}(${baseLimit})` : "(n/a)";

    // Get the original formula values
    let skillKey = Array.isArray(action.formula) && action.formula[0]
      ? action.formula[0]
      : "";
    let attrKey = Array.isArray(action.formula) && action.formula[1]
      ? action.formula[1]
      : "";

    // Apply replacements if applicable
    replacements.forEach(replacement => {
      if (replacement.affects === "matrixAction") {
        // Replace skill
        if (skillKey === replacement.from) {
          skillKey = replacement.to;
        }
        // Replace attribute
        if (attrKey === replacement.from) {
          attrKey = replacement.to;
        }
      }
    });

    const skillVal = skills[skillKey] || 0;
    const attrVal = attributes[attrKey] || 0;
    
    // Get quality bonus for this action - could be from static or choice-type qualities
    const qualityBonus = qualityMods[action.name] || 0;
    
    // Get quality bonus for this action by ID - used by some choice-type qualities
    const actionIdBonus = action.id ? qualityMods[action.id] || 0 : 0;
    
    // Combine both types of bonuses
    const totalQualityBonus = qualityBonus + actionIdBonus;

    // Display the formula with the potentially replaced skill/attribute
    const displaySkill = skillKey || "?";
    const displayAttr = attrKey || "?";
    
    let formula = `${displaySkill}(${skillVal}) + ${displayAttr}(${attrVal})`;
    
    // Get the details for this action's improvements using various possible keys
    const possibleKeys = [action.name];
    
    // Add normalized version of the action name
    if (typeof action.name === 'string') {
      const normalizedName = action.name.toLowerCase().replace(/\s+/g, '');
      possibleKeys.push(normalizedName);
    }
    
    // Add the action ID if available
    if (action.id) {
      possibleKeys.push(action.id);
      
      // Add normalized version of the action ID if it's a string
      if (typeof action.id === 'string') {
        const normalizedId = action.id.toLowerCase().replace(/\s+/g, '');
        possibleKeys.push(normalizedId);
      }
    }
    
    // Collect all details from all possible keys
    let allDetails = [];
    possibleKeys.forEach(key => {
      if (matrixActionDetails[key] && matrixActionDetails[key].length > 0) {
        allDetails = [...allDetails, ...matrixActionDetails[key]];
      }
    });
    
    // Add each improvement to the formula with its specific name and value
    if (allDetails.length > 0) {
      allDetails.forEach(detail => {
        if (detail && detail.value > 0) {
          formula += ` + ${detail.name}(${detail.value})`;
        }
      });
    } else if (totalQualityBonus > 0) {
      // Fallback to the old format if no details are available
      formula += ` + Quality(${totalQualityBonus})`;
    }

    const total = attrVal + skillVal + totalQualityBonus;

    row.append($("<td>").text(action.name || "(unnamed)"));
    row.append($("<td>").text(limitCell));
    row.append($("<td>").text(action.description || ""));
    row.append($("<td>").text(formula));
    row.append($("<td>").text(total));
    table.append(row);
  });
}
