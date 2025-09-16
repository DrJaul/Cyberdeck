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

const getDisplayName = item => item.selectedOption ? `${item.name} (${item.selectedOption})` : item.name;
const getFormulaDisplayName = item => item.name;

const DECK_STAT_MAP = {
  'attack': 'attack', 'Attack': 'attack',
  'sleaze': 'sleaze', 'Sleaze': 'sleaze',
  'dataprocessing': 'dataProcessing', 'dataProcessing': 'dataProcessing', 'Data Processing': 'dataProcessing',
  'firewall': 'firewall', 'Firewall': 'firewall'
};

export function applyImprovements(baseStats, items = []) {
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

  const groupedItems = { static: [], choice: [], replacement: [] };

  items.forEach(item => {
    if (!item.improvements?.selections) return;
    const type = item.improvements.type || "static";
    groupedItems[type] ? groupedItems[type].push(item) : groupedItems.static.push(item);
  });

  processItems(groupedItems, modified);
  return modified;
}

function processItems(groupedItems, modified) {
  groupedItems.replacement.forEach(item => {
    const selections = item.improvements?.selections?.default || [];
    
    selections.forEach(entry => {
      if (entry.affects && entry.formula?.length >= 2) {
        modified.replacements.push({
          from: entry.formula[0],
          to: entry.formula[1],
          affects: entry.affects
        });
      }
    });
  });

  const processItem = (item, isChoice = false) => {
    if (!item.improvements?.selections) return;
    
    const selectionKey = isChoice && item.selectedOption && 
                        item.improvements.selections[item.selectedOption] 
                        ? item.selectedOption : "default";
    
    const selections = item.improvements.selections[selectionKey] || [];
    const displayName = getDisplayName(item);
    
    processSelections(selections, displayName, item, modified);
  };

  groupedItems.static.forEach(item => processItem(item));
  groupedItems.choice.forEach(item => processItem(item, true));
}

function processSelections(selections, displayName, item, modified) {
  if (!Array.isArray(selections)) return;
  
  selections.forEach(entry => {
    if (!entry) return;
    
    const targetGroup = entry.affects;
    
    if (targetGroup === "notes" && entry.value && typeof entry.value === 'string') {
      modified.notes.push({ text: entry.value, source: displayName });
      return;
    }
    
    for (const [target, value] of Object.entries(entry)) {
      if (["affects", "formula", "matrixActionId", "action"].includes(target)) continue;
      if (typeof value !== 'number' && !(!isNaN(parseFloat(value)) && isFinite(value))) continue;
      
      const numericValue = Number(value);
      
      switch (targetGroup) {
        case "attribute":
          modified.attributes[target] = (modified.attributes[target] || 0) + numericValue;
          break;
          
        case "skill":
          modified.skills[target] = (modified.skills[target] || 0) + numericValue;
          break;
          
        case "deckStat":
          const normalizedTarget = DECK_STAT_MAP[target] || target.toLowerCase();
          modified.deckStats[normalizedTarget] = (modified.deckStats[normalizedTarget] || 0) + numericValue;
          break;
          
        case "notes":
          if (value && typeof value === 'string') {
            modified.notes.push({ text: value, source: displayName });
          }
          break;
          
        case "matrixAction":
          const actionId = entry.matrixActionId;
          
          if (!actionId) {
            modified.globalMatrixActionDetails.push({
              name: getFormulaDisplayName(item),
              value: Number(value),
              type: item.type || (item.rating ? "program" : "quality")
            });
            continue;
          }
          
          modified.matrixActions[actionId] = (modified.matrixActions[actionId] || 0) + Number(value);
          
          if (!modified.matrixActionDetails[actionId]) {
            modified.matrixActionDetails[actionId] = [];
          }
          
          modified.matrixActionDetails[actionId].push({
            name: getFormulaDisplayName(item),
            value: Number(value),
            type: item.type || (item.rating ? "program" : "quality")
          });
          break;
      }
    }
  });
}

export function renderMatrixActions(actions, attributes, skills, baseStats, qualityMods, replacements = [], matrixActionDetails = {}, globalMatrixActionDetails = []) {
  const activeActions = actions.filter(action => action.isActive);
  
  const table = $("#matrix-actions-table");
  const tableHead = table.find("thead").empty();
  const tableBody = table.find("tbody").empty();
  
  const limitToStatMap = {
    "data processing": "dataProcessing",
    "attack": "attack",
    "sleaze": "sleaze",
    "firewall": "firewall"
  };
  
  const allFields = ['name', 'description', 'action', 'marks', 'limit', 'formula', 'opposedRoll', 'total'];
  
  // Create header row
  const headerRow = $("<tr>");
  allFields.forEach(field => {
    headerRow.append($("<th>").text(
      field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    ));
  });
  tableHead.append(headerRow);
  
  // Create rows for each action
  activeActions.forEach(action => {
    const row = $("<tr>");
    
    // Calculate values
    const limitKey = (action.limit || "").toLowerCase();
    const statKey = limitToStatMap[limitKey] || limitKey;
    const baseLimit = baseStats[statKey] ?? 0;
    
    const [skillKey, attrKey] = getFormulaComponents(action, replacements);
    const skillVal = skills[skillKey] || 0;
    const attrVal = attributes[attrKey] || 0;
    
    // Calculate bonuses
    const qualityBonus = qualityMods[action.name] || 0;
    const actionIdBonus = action.id ? qualityMods[action.id] || 0 : 0;
    const totalQualityBonus = qualityBonus + actionIdBonus;
    
    // Calculate global bonus
    let globalBonus = 0;
    globalMatrixActionDetails?.forEach(detail => {
      if (detail?.value > 0) globalBonus += detail.value;
    });
    
    const dicePool = attrVal + skillVal + totalQualityBonus + globalBonus;
    
    // Build formula display
    const formulaDisplay = buildFormulaDisplay(
      skillKey || "?", skillVal, attrKey || "?", attrVal,
      action, matrixActionDetails, totalQualityBonus, globalMatrixActionDetails
    );
    
    // Add each field to the row
    allFields.forEach(field => {
      let content = "";
      
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

function getFormulaComponents(action, replacements = []) {
  if (!action) return ["", ""];
  
  let skillKey = "";
  let attrKey = "";
  
  if (Array.isArray(action.formula)) {
    skillKey = action.formula[0] || "";
    attrKey = action.formula.length > 1 ? action.formula[1] : "";
  }

  replacements?.forEach(replacement => {
    if (replacement?.affects === "matrixAction") {
      if (skillKey === replacement.from) skillKey = replacement.to;
      if (attrKey === replacement.from) attrKey = replacement.to;
    }
  });
  
  return [skillKey, attrKey];
}

function formatDisplayName(name) {
  if (!name || typeof name !== 'string') return name || "?";
  
  if (name === 'electronicWarfare') return 'E.War';
  
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function buildFormulaDisplay(displaySkill, skillVal, displayAttr, attrVal, action, matrixActionDetails = {}, totalQualityBonus = 0, globalMatrixActionDetails = []) {
  const formattedSkill = formatDisplayName(displaySkill);
  const formattedAttr = formatDisplayName(displayAttr);
  
  let formula = `${formattedSkill}(${skillVal}) + ${formattedAttr}(${attrVal})`;
  
  // Add action-specific details
  if (action?.id && matrixActionDetails[action.id]) {
    matrixActionDetails[action.id]?.forEach(detail => {
      if (detail?.value > 0) {
        formula += ` + ${detail.name || "?"}(${detail.value})`;
      }
    });
  }
  
  // Add global matrix action improvements
  globalMatrixActionDetails?.forEach(detail => {
    if (detail?.value > 0) {
      formula += ` + ${detail.name || "?"}(${detail.value})`;
    }
  });
  
  return formula;
}
