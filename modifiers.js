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

// Helper function to get display name for an item (with selected option if applicable)
function getDisplayName(item) {
  if (item.selectedOption) {
    return `${item.name} (${item.selectedOption})`;
  }
  return item.name;
}

// Helper function to get display name for formula display (without selected option)
function getFormulaDisplayName(item) {
  return item.name;
}

// Apply improvements from items to base stats
export function applyImprovements(baseStats, items = []) {
  console.log(`[Improvements] Starting to apply improvements from ${items.length} items`);
  
  // Create modified stats object with shallow copies of base stat objects
  const modified = {
    attributes: { ...baseStats.attributes },
    skills: { ...baseStats.skills },
    deckStats: { ...baseStats.deckStats },
    matrixActions: {},
    matrixActionDetails: {},
    replacements: [],
    notes: [],
    globalMatrixActionDetails: []
  };

  // Group items by type for more efficient processing
  const groupedItems = {
    static: [],
    choice: [],
    replacement: []
  };

  // Pre-sort items into groups
  items.forEach(item => {
    if (!item.improvements?.selections) return;
    const type = item.improvements.type || "static";
    if (groupedItems[type]) {
      groupedItems[type].push(item);
    } else {
      groupedItems.static.push(item); // Default to static if unknown type
    }
  });
  
  console.log(`[Improvements] Grouped items: ${groupedItems.replacement.length} replacement, ${groupedItems.static.length} static, ${groupedItems.choice.length} choice`);

  // Process replacement-type improvements first (they affect formulas)
  groupedItems.replacement.forEach(item => {
    processReplacementItem(item, modified);
  });

  // Process static improvements
  groupedItems.static.forEach(item => {
    processStaticItem(item, modified);
  });

  // Process choice-type improvements
  groupedItems.choice.forEach(item => {
    processChoiceItem(item, modified);
  });
  
  console.log(`[Improvements] All improvements applied, modified stats:`, {
    attributes: modified.attributes,
    skills: modified.skills,
    deckStats: modified.deckStats,
    replacements: modified.replacements.length,
    matrixActions: Object.keys(modified.matrixActions).length
  });

  return modified;
}

// Process a replacement-type item
function processReplacementItem(item, modified) {
  if (!item.improvements?.selections) return;
  
  console.log(`[Improvements] Processing replacement item: ${item.name}`);
  
  const selections = item.improvements.selections.default || [];
  
  selections.forEach(entry => {
    if (entry.affects && entry.formula?.length >= 2) {
      modified.replacements.push({
        from: entry.formula[0],
        to: entry.formula[1],
        affects: entry.affects
      });
      console.log(`[Improvements] Added replacement: ${entry.formula[0]} -> ${entry.formula[1]} for ${entry.affects}`);
    }
  });
}

// Process a static-type item
function processStaticItem(item, modified) {
  if (!item.improvements?.selections) return;
  
  console.log(`[Improvements] Processing static item: ${item.name}`);
  
  const selections = item.improvements.selections.default || [];
  const displayName = getDisplayName(item);
  
  processSelections(selections, displayName, item, modified);
}

// Process a choice-type item
function processChoiceItem(item, modified) {
  if (!item.improvements?.selections) return;
  
  const selectionKey = item.selectedOption && 
                      item.improvements.selections[item.selectedOption] 
                      ? item.selectedOption : "default";
  
  console.log(`[Improvements] Processing choice item: ${item.name} with selection: ${selectionKey}`);
  
  const selections = item.improvements.selections[selectionKey] || [];
  const displayName = getDisplayName(item);
  
  processSelections(selections, displayName, item, modified);
}

// Process selections from an item
function processSelections(selections, displayName, item, modified) {
  selections.forEach(entry => {
    const targetGroup = entry.affects;
    
    console.log(`[Improvements] Processing selection affecting: ${targetGroup} from ${displayName}`);
    
    // Special handling for notes which use a "value" property
    if (targetGroup === "notes" && entry.value && typeof entry.value === 'string') {
      modified.notes.push({ text: entry.value, source: displayName });
      console.log(`[Improvements] Added note: "${entry.value}" from ${displayName}`);
      return;
    }
    
    for (const [target, value] of Object.entries(entry)) {
      // Skip non-value properties
      if (target === "affects" || target === "formula" || target === "matrixActionId"|| target === "action") continue;
      
      switch (targetGroup) {
        case "attribute":
          modified.attributes[target] = (modified.attributes[target] || 0) + value;
          console.log(`[Improvements] Modified attribute ${target}: +${value} from ${displayName}`);
          break;
          
        case "skill":
          modified.skills[target] = (modified.skills[target] || 0) + value;
          console.log(`[Improvements] Modified skill ${target}: +${value} from ${displayName}`);
          break;
          
        case "deckStat":
          // Normalize deck stat property names to match the expected property names
          let normalizedTarget = target;
          
          // Convert capitalized property names to the expected format
          if (target === "Attack" || target === "attack") {
            normalizedTarget = "attack";
          } else if (target === "Data Processing" || target === "dataProcessing") {
            normalizedTarget = "dataProcessing";
          } else if (target === "Sleaze" || target === "sleaze") {
            normalizedTarget = "sleaze";
          } else if (target === "Firewall" || target === "firewall") {
            normalizedTarget = "firewall";
          }
          
          modified.deckStats[normalizedTarget] = (modified.deckStats[normalizedTarget] || 0) + value;
          console.log(`[Improvements] Modified deck stat ${normalizedTarget}: +${value} from ${displayName}`);
          break;
          
        case "notes":
          if (value && typeof value === 'string') {
            modified.notes.push({ text: value, source: displayName });
            console.log(`[Improvements] Added note: "${value}" from ${displayName}`);
          }
          break;
          
        case "matrixAction":
          const actionId = entry.matrixActionId;
          
          // Handle global matrix action improvements (no specific actionId)
          if (!actionId) {
            modified.globalMatrixActionDetails.push({
              name: getFormulaDisplayName(item),
              value: Number(value),
              type: item.type || (item.rating ? "program" : "quality")
            });
            console.log(`[Improvements] Added global matrix action bonus: +${value} from ${displayName}`);
            continue;
          }
          
          // Add to matrix action total for specific action
          modified.matrixActions[actionId] = (modified.matrixActions[actionId] || 0) + Number(value);
          
          // Store details for formula display
          if (!modified.matrixActionDetails[actionId]) {
            modified.matrixActionDetails[actionId] = [];
          }
          
          modified.matrixActionDetails[actionId].push({
            name: getFormulaDisplayName(item),
            value: Number(value),
            type: item.type || (item.rating ? "program" : "quality")
          });
          console.log(`[Improvements] Modified matrix action ${actionId}: +${value} from ${displayName}`);
          break;
      }
    }
  });
}

export function renderMatrixActions(actions, attributes, skills, baseStats, qualityMods, replacements = [], matrixActionDetails = {}, globalMatrixActionDetails = []) {
  // Only display active matrix actions
  const activeActions = actions.filter(action => action.isActive === true);
  
  const table = $("#matrix-actions-table");
  const tableHead = table.find("thead");
  const tableBody = table.find("tbody");
  
  tableHead.empty();
  tableBody.empty();
  
  // Map for deck stat lookups
  const limitToStatMap = {
    "data processing": "dataProcessing",
    "attack": "attack",
    "sleaze": "sleaze",
    "firewall": "firewall"
  };
  
  // Define columns in specific order (excluding 'function' and 'isActive')
  const allFields = new Set([
    'name',
    'description',
    'action',
    'marks',
    'limit',
    'formula',
    'opposedRoll',
    'total'
  ]);
  
  // Create header row
  const headerRow = $("<tr>");
  allFields.forEach(field => {
    const displayName = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    headerRow.append($("<th>").text(displayName));
  });
  tableHead.append(headerRow);
  
  // Create rows for each action
  activeActions.forEach(action => {
    const row = $("<tr>");
    
    // Calculate values for special fields
    const limitKey = (action.limit || "").toLowerCase();
    const statKey = limitToStatMap[limitKey] || limitKey;
    const baseLimit = baseStats[statKey] ?? 0;
    
    const [skillKey, attrKey] = getFormulaComponents(action, replacements);
    const skillVal = skills[skillKey] || 0;
    const attrVal = attributes[attrKey] || 0;
    
    const qualityBonus = qualityMods[action.name] || 0;
    const actionIdBonus = action.id ? qualityMods[action.id] || 0 : 0;
    const totalQualityBonus = qualityBonus + actionIdBonus;
    
    // Calculate global matrix action bonus
    let globalBonus = 0;
    if (globalMatrixActionDetails?.length > 0) {
      globalMatrixActionDetails.forEach(detail => {
        if (detail?.value > 0) {
          globalBonus += detail.value;
        }
      });
    }
    
    // Include global bonus in dice pool calculation
    const dicePool = attrVal + skillVal + totalQualityBonus + globalBonus;
    
    const formulaDisplay = buildFormulaDisplay(
      skillKey || "?", 
      skillVal, 
      attrKey || "?", 
      attrVal,
      action,
      matrixActionDetails,
      totalQualityBonus,
      globalMatrixActionDetails
    );
    
    // Add each field to the row
    allFields.forEach(field => {
      let content = "";
      
      // Set cell content based on field type
      switch (field) {
        case 'formula':
          content = action.formula.length > 0 ? formulaDisplay : "N/a";
          break;
        case 'total':
          content = dicePool;
          break;
        case 'limit':
          content = action.limit ? `${action.limit}(${baseLimit})` : "(n/a)";
          break;
        default:
          content = action[field] !== undefined ? action[field] : "";
      }
      
      row.append($("<td>").text(content));
    });
    
    tableBody.append(row);
  });
}

// Extract skill and attribute from formula, applying replacements
function getFormulaComponents(action, replacements) {
  let skillKey = Array.isArray(action.formula) && action.formula[0] ? action.formula[0] : "";
  let attrKey = Array.isArray(action.formula) && action.formula[1] ? action.formula[1] : "";

  // Apply replacements if applicable
  replacements.forEach(replacement => {
    if (replacement.affects === "matrixAction") {
      if (skillKey === replacement.from) skillKey = replacement.to;
      if (attrKey === replacement.from) attrKey = replacement.to;
    }
  });
  
  return [skillKey, attrKey];
}

// Format a skill or attribute name for display
function formatDisplayName(name) {
  if (!name || typeof name !== 'string') return name;
  
  // Special case for electronicWarfare
  if (name === 'electronicWarfare') return 'E.War';
  
  // Add spaces before capital letters and capitalize first letter
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// Build the formula display string with all bonuses
function buildFormulaDisplay(displaySkill, skillVal, displayAttr, attrVal, action, matrixActionDetails, totalQualityBonus, globalMatrixActionDetails = []) {
  // Format skill and attribute names
  const formattedSkill = formatDisplayName(displaySkill);
  const formattedAttr = formatDisplayName(displayAttr);
  
  let formula = `${formattedSkill}(${skillVal}) + ${formattedAttr}(${attrVal})`;
  
  // Get action identifiers for looking up details
  const actionKeys = [];
  
  if (action.id) {
    actionKeys.push(action.id);
  }
  
  // Find all improvement details for this action
  const allDetails = [];
  actionKeys.forEach(key => {
    if (matrixActionDetails[key]?.length > 0) {
      allDetails.push(...matrixActionDetails[key]);
    }
  });
  
  // Add detailed bonuses to formula
  if (allDetails.length > 0) {
    allDetails.forEach(detail => {
      if (detail?.value > 0) {
        formula += ` + ${detail.name}(${detail.value})`;
      }
    });
  }
  
  // Add global matrix action improvements
  if (globalMatrixActionDetails?.length > 0) {
    globalMatrixActionDetails.forEach(detail => {
      if (detail?.value > 0) {
        formula += ` + ${detail.name}(${detail.value})`;
      }
    });
  }
  
  return formula;
}
