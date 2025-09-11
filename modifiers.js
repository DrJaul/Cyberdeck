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
              if (!actionId) continue;
              
              // Add to matrix action total
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

export function renderMatrixActions(actions, attributes, skills, baseStats, qualityMods, replacements = [], matrixActionDetails = {}) {
  if (debug) console.log(`[DEBUG] Rendering ${actions.length} matrix actions`);
  
  const table = $("#matrix-actions-table tbody");
  table.empty();

  // Map from limit names to baseStats keys
  const limitToStatMap = {
    "data processing": "dataProcessing",
    "attack": "attack",
    "sleaze": "sleaze",
    "firewall": "firewall"
  };

  actions.forEach(action => {
    const row = $("<tr>");
    
    // Handle limit display
    const limitKey = (action.limit || "").toLowerCase();
    const statKey = limitToStatMap[limitKey] || limitKey;
    const baseLimit = baseStats[statKey] ?? 0;
    const limitCell = action.limit ? `${action.limit}(${baseLimit})` : "(n/a)";

    // Extract and apply formula replacements
    let [skillKey, attrKey] = getFormulaComponents(action, replacements);
    const skillVal = skills[skillKey] || 0;
    const attrVal = attributes[attrKey] || 0;
    
    // Calculate quality bonuses
    const qualityBonus = qualityMods[action.name] || 0;
    const actionIdBonus = action.id ? qualityMods[action.id] || 0 : 0;
    const totalQualityBonus = qualityBonus + actionIdBonus;

    // Build formula display
    const formula = buildFormulaDisplay(
      skillKey || "?", 
      skillVal, 
      attrKey || "?", 
      attrVal,
      action,
      matrixActionDetails,
      totalQualityBonus
    );

    // Calculate total dice pool
    const total = attrVal + skillVal + totalQualityBonus;

    // Build table row
    row.append($("<td>").text(action.name || "(unnamed)"));
    row.append($("<td>").text(limitCell));
    row.append($("<td>").text(action.description || ""));
    row.append($("<td>").text(formula));
    row.append($("<td>").text(total));
    table.append(row);
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

// Build the formula display string with all bonuses
function buildFormulaDisplay(displaySkill, skillVal, displayAttr, attrVal, action, matrixActionDetails, totalQualityBonus) {
  let formula = `${displaySkill}(${skillVal}) + ${displayAttr}(${attrVal})`;
  
  // Get action identifiers for looking up details
  const actionKeys = [action.name];
  
  if (typeof action.name === 'string') {
    actionKeys.push(action.name.toLowerCase().replace(/\s+/g, ''));
  }
  
  if (action.id) {
    actionKeys.push(action.id);
    if (typeof action.id === 'string') {
      actionKeys.push(action.id.toLowerCase().replace(/\s+/g, ''));
    }
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
  
  return formula;
}
