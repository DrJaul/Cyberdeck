function getAttributes() {
  return {
    logic: parseInt($("#attr-logic").val(), 10) || 0,
    intuition: parseInt($("#attr-intuition").val(), 10) || 0,
    reaction: parseInt($("#attr-reaction").val(), 10) || 0
  };
}

function getSkills() {
  return {
    hacking: parseInt($("#skill-hacking").val(), 10) || 0,
    computer: parseInt($("#skill-computer").val(), 10) || 0,
    ewarfare: parseInt($("#skill-ewarfare").val(), 10) || 0,
    cybercombat: parseInt($("#skill-cybercombat").val(), 10) || 0,
    software: parseInt($("#skill-software").val(), 10) || 0
  };
}

function getAllMatrixActionNames(matrixActions) {
  return matrixActions.map(action => action.name.toLowerCase());
}

function applyImprovements(baseStats, selectedQualities, matrixActions) {
  const modified = {
    attributes: { ...baseStats.attributes },
    skills: { ...baseStats.skills },
    deckStats: { ...baseStats.deckStats },
    matrixActions: {},
    notes: []
  };

  const actionNames = getAllMatrixActionNames(matrixActions);

  selectedQualities.forEach(quality => {
    const imp = quality.improvements;
    if (!imp) return;

    const entries = imp.selections?.default || [];

    entries.forEach(entry => {
      switch (entry.affects) {
        case "attribute":
          if (modified.attributes.hasOwnProperty(entry.name)) {
            modified.attributes[entry.name] += entry.value;
          }
          break;
        case "skill":
          if (modified.skills.hasOwnProperty(entry.name)) {
            modified.skills[entry.name] += entry.value;
          }
          break;
        case "deckStat":
          if (modified.deckStats.hasOwnProperty(entry.name)) {
            modified.deckStats[entry.name] += entry.value;
          }
          break;
        case "matrixAction":
          const actionKey = entry.name.toLowerCase();
          if (actionNames.includes(actionKey)) {
            if (!modified.matrixActions[actionKey]) {
              modified.matrixActions[actionKey] = { limit: 0, pool: 0 };
            }
            modified.matrixActions[actionKey].pool += entry.value;
          }
          break;
        case "note":
          if (entry.text) {
            modified.notes.push(entry.text);
          }
          break;
      }
    });
  });

  return modified;
}

function renderMatrixActions(matrixActions, attributes, skills, deckStats, modMatrixActions) {
  const tbody = $("#matrix-actions-table tbody");
  tbody.empty();

  matrixActions.forEach(action => {
    const baseLimit = evalFormula(action.limit, attributes, skills, deckStats);
    const basePool = evalFormula(action.formula, attributes, skills, deckStats);

    const mod = modMatrixActions[action.name.toLowerCase()] || { pool: 0 };

    const tr = $("<tr>");
    tr.append($("<td>").text(action.name));
    tr.append($("<td>").text(`${action.limit} (${baseLimit})`));
    tr.append($("<td>").text(action.description));
    tr.append($("<td>").text(`${action.formula} (${basePool})`));
    tr.append($("<td>").text(basePool + mod.pool));
    tbody.append(tr);
  });
}

function evalFormula(formula, attributes, skills, deckStats) {
  try {
    const combined = { ...attributes, ...skills, ...deckStats };
    const expr = formula.replace(/\b(\w+)\b/g, (match) => {
      return combined.hasOwnProperty(match) ? combined[match] : "0";
    });
    return eval(expr);
  } catch {
    return 0;
  }
}

export {
  getAttributes,
  getSkills,
  applyImprovements,
  renderMatrixActions
};
