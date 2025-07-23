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

export function getAllMatrixActionNames(matrixActions) {
  return matrixActions.map(action => action.name);
}

export function applyImprovements(baseStats, sources, matrixActionsList) {
  const modified = JSON.parse(JSON.stringify(baseStats));
  modified.matrixActions = {};
  modified.notes = [];

  const allMatrixActionNames = getAllMatrixActionNames(matrixActionsList);

  sources.forEach(source => {
    const { improvements } = source;
    if (!improvements || !improvements.selections) return;

    const selectionKey =
      improvements.type === "choice" && source.selected
        ? source.selected
        : "default";

    const improvementsList = improvements.selections[selectionKey] || [];

    for (const imp of improvementsList) {
      switch (imp.affects) {
        case "matrixAction": {
          const targets = imp.onMatrixAction
            ? [imp.onMatrixAction]
            : allMatrixActionNames;
          targets.forEach(name => {
            if (!modified.matrixActions[name]) {
              modified.matrixActions[name] = { valueBonus: 0, limitBonus: 0 };
            }
            if (imp.value) {
              modified.matrixActions[name].valueBonus += imp.value;
            }
            if (imp.limit) {
              modified.matrixActions[name].limitBonus += imp.limit;
            }
          });
          break;
        }

        case "attribute": {
          for (const key in imp) {
            if (key !== "affects") {
              modified.attributes[key] = (modified.attributes[key] || 0) + imp[key];
            }
          }
          break;
        }

        case "skill": {
          for (const key in imp) {
            if (key !== "affects") {
              modified.skills[key] = (modified.skills[key] || 0) + imp[key];
            }
          }
          break;
        }

        case "deckStat": {
          for (const key in imp) {
            if (key !== "affects") {
              modified.deckStats[key] = (modified.deckStats[key] || 0) + imp[key];
            }
          }
          break;
        }

        case "notes": {
          if (imp.value) {
            modified.notes.push(imp.value);
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
    const mod = qualityMods[action.name] || { valueBonus: 0, limitBonus: 0 };
    const totalLimit = baseLimit + (mod.limitBonus || 0);
    const limitCell = `${action.limit}(${totalLimit})`;

    const attrVal = attributes[action.formula[0].toLowerCase()] || 0;
    const skillVal = skills[action.formula[1].toLowerCase()] || 0;
    const qualityBonus = mod.valueBonus || 0;

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
