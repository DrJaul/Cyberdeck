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
  if (!modified.replacements) modified.replacements = [];

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
              case "matrixAction":
                if (!modified.matrixActions[target]) modified.matrixActions[target] = 0;
                modified.matrixActions[target] += value;
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

export function renderMatrixActions(actions, attributes, skills, baseStats, qualityMods, replacements = []) {
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
    const qualityBonus = qualityMods[action.name] || 0;

    // Display the formula with the potentially replaced skill/attribute
    const displaySkill = skillKey || "?";
    const displayAttr = attrKey || "?";
    
    const formula = `${displaySkill}(${skillVal}) + ${displayAttr}(${attrVal})` +
      (qualityBonus > 0 ? ` + ${action.name}[Quality](${qualityBonus})` : "");

    const total = attrVal + skillVal + qualityBonus;

    row.append($("<td>").text(action.name || "(unnamed)"));
    row.append($("<td>").text(limitCell));
    row.append($("<td>").text(action.description || ""));
    row.append($("<td>").text(formula));
    row.append($("<td>").text(total));
    table.append(row);
  });
}
