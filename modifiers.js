// Import debug flag from uiHandlers.js
import { debug } from './uiHandlers.js';

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

export function applyImprovements(baseStats, items = []) {
  if (debug) console.log(`[DEBUG] Applying improvements from ${items.length} items`);
  
  // Create modified stats object with shallow copies of base stat objects
  const modified = {
    attributes: { ...baseStats.attributes } || {},
    skills: { ...baseStats.skills } || {},
    deckStats: { ...baseStats.deckStats } || {},
    matrixActions: {},
    matrixActionDetails: {},
    replacements: [],
    notes: []
  };

  // Process each item (quality or program)
  items.forEach(item => {
    if (!item.improvements?.selections) return;
    
    const type = item.improvements.type || "static";
    const selectionKey = (type === "choice" && item.selectedOption && 
                         item.improvements.selections[item.selectedOption]) 
                         ? item.selectedOption : "default";
    const selections = item.improvements.selections[selectionKey] || [];
    const displayName = getDisplayName(item);
    
    // Process each improvement in the selected option
    selections.forEach(entry => {
      const targetGroup = entry.affects;
      
      // Handle replacement-type improvements
      if (type === "replacement" && entry.formula?.length >= 2) {
        modified.replacements.push({
          from: entry.formula[0],
          to: entry.formula[1],
          affects: targetGroup
        });
        return;
      }
      
      // Handle static and choice-type improvements
      if (type === "static" || type === "choice") {
        for (const [target, value] of Object.entries(entry)) {
          // Skip non-value properties
          if (target === "affects" || target === "formula" || target === "matrixActionId") continue;
          
          switch (targetGroup) {
            case "attribute":
              modified.attributes[target] = (modified.attributes[target] || 0) + value;
              break;
              
            case "skill":
              modified.skills[target] = (modified.skills[target] || 0) + value;
              break;
              
            case "deckStat":
              modified.deckStats[target] = (modified.deckStats[target] || 0) + value;
              break;
              
            case "notes":
              if (value && typeof value === 'string') {
                modified.notes.push({ text: value, source: displayName });
              }
              break;
              
            case "matrixAction":
              const actionId = entry.matrixActionId;
              
              // Handle global matrix action improvements (no specific actionId)
              if (!actionId) {
                // Initialize globalMatrixActionDetails if it doesn't exist
                if (!modified.globalMatrixActionDetails) {
                  modified.globalMatrixActionDetails = [];
                }
                
                // Store the global improvement details
                modified.globalMatrixActionDetails.push({
                  name: displayName,
                  value: value,
                  type: item.type || (item.rating ? "program" : "quality")
                });
                continue;
              }
              
              // Add to matrix action total for specific action
              modified.matrixActions[actionId] = (modified.matrixActions[actionId] || 0) + value;
              
              // Store details for formula display
              if (!modified.matrixActionDetails[actionId]) {
                modified.matrixActionDetails[actionId] = [];
              }
              
              modified.matrixActionDetails[actionId].push({
                name: displayName,
                value: value,
                type: item.type || (item.rating ? "program" : "quality")
              });
              break;
          }
        }
      }
    });
  });

  return modified;
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
    
    const dicePool = attrVal + skillVal + totalQualityBonus;
    
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
          content = action.formula.length >0 ? formulaDisplay : "N/a";
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
  
  // Add action.name and normalized version if it's a string
  if (action.name) {
    actionKeys.push(action.name);
    if (typeof action.name === 'string') {
      actionKeys.push(action.name.toLowerCase().replace(/\s+/g, ''));
    }
  }
  
  // Add action.id - ensure we check both number and string versions
  if (action.id) {
    // Add as number
    actionKeys.push(action.id);
    // Add as string
    actionKeys.push(String(action.id));
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
  } else if (totalQualityBonus > 0) {
    formula += ` + Quality(${totalQualityBonus})`;
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
