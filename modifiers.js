export function getAttributes() {
  return {
    logic: parseInt($("#attr-logic").val()) || 0,
    intuition: parseInt($("#attr-intuition").val()) || 0
  };
}

export function getSkills() {
  return {
    hacking: parseInt($("#skill-hacking").val()) || 0,
    computer: parseInt($("#skill-computer").val()) || 0,
    electronicWarfare: parseInt($("#skill-ew").val()) || 0,
    cybercombat: parseInt($("#skill-cybercombat").val()) || 0
  };
}

export function applyImprovements(baseStats, qualities) {
  const modified = JSON.parse(JSON.stringify(baseStats)); // deep clone
  qualities.forEach(q => {
    if (q.improvements) {
      for (const key in q.improvements) {
        switch (key) {
          case "attributes":
            for (const attr in q.improvements.attributes) {
              modified.attributes[attr] += q.improvements.attributes[attr];
            }
            break;
          case "skills":
            for (const skill in q.improvements.skills) {
              modified.skills[skill] += q.improvements.skills[skill];
            }
            break;
          case "deckStats":
            for (const stat in q.improvements.deckStats) {
              modified.deckStats[stat] += q.improvements.deckStats[stat];
            }
            break;
          case "matrixActions":
            if (!modified.matrixActions) modified.matrixActions = {};
            for (const action in q.improvements.matrixActions) {
              modified.matrixActions[action] =
                (modified.matrixActions[action] || 0) +
                q.improvements.matrixActions[action];
            }
            break;
        }
      }
    }
  });
  return modified;
}

export function renderMatrixActions(actions, attributes, skills, baseStats, qualityMods) {
  const table = $("#matrix-actions-table tbody");
  table.empty();

  actions.forEach(action => {
    const row = $("<tr>");
    const baseLimit = baseStats[action.limit.toLowerCase()] || 0;
    const limitCell = `${action.limit}(${baseLimit})`;
    const attrVal = attributes[action.formula[0].toLowerCase()] || 0;
    const skillVal = skills[action.formula[1].toLowerCase()] || 0;
    const qualityBonus =
      qualityMods[action.name] ? qualityMods[action.name] : 0;

    const formula = `${action.attribute}(${attrVal}) + ${action.skill}(${skillVal})` +
      (qualityBonus > 0 ? ` + ${action.name}[Quality](${qualityBonus})` : "");

    const total = attrVal + skillVal + qualityBonus;

    row.append($("<td>").text(action.name));
    row.append($("<td>").text(limitCell));
    row.append($("<td>").text(action.description));
    row.append($("<td>").text(formula));
    row.append($("<td>").text(total));
    table.append(row);
  });
}
