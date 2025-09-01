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

export function applyImprovements(baseStats, qualities = []) {
  const modified = JSON.parse(JSON.stringify(baseStats)); // deep clone

  if (!modified.attributes) modified.attributes = {};
  if (!modified.skills) modified.skills = {};
  if (!modified.deckStats) modified.deckStats = {};
  if (!modified.matrixActions) modified.matrixActions = {};

  qualities.forEach(q => {
    if (q.improvements && q.improvements.selections) {
      const type = q.improvements.type || "static";
      const selections = q.improvements.selections;

      // For now, apply default only; choice/ranked logic not yet implemented
      const selectionArray = selections.default || [];

      selectionArray.forEach(entry => {
        for (const [target, value] of Object.entries(entry)) {
          if (target === "affects") continue;
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
      });
    }
  });

  return modified;
}

export function renderMatrixActions(actions, attributes, skills, baseStats, qualityMods) {
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

    // Use the original formula values without converting to lowercase
    const skillKey = Array.isArray(action.formula) && action.formula[0]
      ? action.formula[0]
      : "";
    const attrKey = Array.isArray(action.formula) && action.formula[1]
      ? action.formula[1]
      : "";

    const skillVal = skills[skillKey] || 0;
    const attrVal = attributes[attrKey] || 0;
    const qualityBonus = qualityMods[action.name] || 0;

    const formula = `${action.formula?.[0] || "?"}(${skillVal}) + ${action.formula?.[1] || "?"}(${attrVal})` +
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
