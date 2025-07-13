let qualities = [];
let deckPresets = [];
let programs = [];
let matrixActions = [];
let statMods = {
  attributes: {},
  skills: {},
  deckStats: {},
  matrixActions: {}
};

function applyImprovements() {
  const selectedQualities = [];
  $('#quality-list input[type="checkbox"]:checked').each(function () {
    const qualityName = $(this).val();
    const quality = qualities.find(q => q.name === qualityName);
    if (quality && quality.improvements) {
      selectedQualities.push(quality.improvements);
    }
  });

  statMods = {
    attributes: {},
    skills: {},
    deckStats: {},
    matrixActions: {}
  };

  selectedQualities.forEach(improvement => {
    for (let category in improvement) {
      for (let key in improvement[category]) {
        const value = improvement[category][key];
        switch (category) {
          case 'attributes':
            statMods.attributes[key] = (statMods.attributes[key] || 0) + value;
            break;
          case 'skills':
            statMods.skills[key] = (statMods.skills[key] || 0) + value;
            break;
          case 'deckStats':
            statMods.deckStats[key] = (statMods.deckStats[key] || 0) + value;
            break;
          case 'matrixActions':
            statMods.matrixActions[key] = (statMods.matrixActions[key] || 0) + value;
            break;
        }
      }
    }
  });

  window.statMods = statMods;

  for (let stat in statMods.deckStats) {
    const base = parseInt($('[name="' + stat + '"]').val()) || 0;
    const augmented = base + statMods.deckStats[stat];
    const $box = $('.stat-box[data-type="' + stat + '"]');
    const label = base !== augmented ? `${base} (${augmented})` : `${base}`;
    $box.find('span').text(label);
  }

  renderMatrixActions();
  saveState();
}

function renderMatrixActions() {
  const attrs = getAttributes();
  const skills = getSkills();
  const tbody = $('#matrix-actions-table tbody');
  tbody.empty();
  matrixActions.forEach(ac => {
    const row = $('<tr>');
    row.append(`<td>${ac.name}</td>`);
    row.append(`<td>${
      (function () {
        const stat = ac.limit.toLowerCase();
        const base = parseInt($('[name="' + stat + '"]').val()) || 0;
        const mod = (window.statMods?.deckStats?.[stat] || 0);
        const total = base + mod;
        return `${ac.limit}(${total})`;
      })()
    }</td>`);
    row.append(`<td>${ac.description}</td>`);
    row.append(`<td>${
      (function () {
        let base = ac.formula.map(p => `${p}(${(attrs[p] || skills[p] || 0)})`).join(' + ');
        let bonuses = [];
        for (const q of qualities) {
          if ($('#quality-list input[value="' + q.name + '"]').is(':checked')) {
            const mod = q.improvements?.matrixActions?.[ac.name];
            if (mod) bonuses.push(`${q.name}(${mod})`);
          }
        }
        return base + (bonuses.length ? ' + ' + bonuses.join(' + ') : '');
      })()
    }</td>`);
    const pool = ac.formula.reduce((sum, p) => sum + (attrs[p] || skills[p] || 0), 0) +
      (statMods.matrixActions[ac.name] || 0);
    row.append(`<td>${pool}</td>`);
    tbody.append(row);
  });
}

function getAttributes() {
  return {
    logic: parseInt($('#attr-logic').val()) + (statMods.attributes.logic || 0) || 0,
    intuition: parseInt($('#attr-intuition').val()) + (statMods.attributes.intuition || 0) || 0,
    reaction: parseInt($('#attr-reaction').val()) + (statMods.attributes.reaction || 0) || 0
  };
}

function getSkills() {
  return {
    hacking: parseInt($('#skill-hacking').val()) + (statMods.skills.hacking || 0) || 0,
    computer: parseInt($('#skill-computer').val()) + (statMods.skills.computer || 0) || 0,
    electronicWarfare: parseInt($('#skill-ewarfare').val()) + (statMods.skills.electronicWarfare || 0) || 0,
    cybercombat: parseInt($('#skill-cybercombat').val()) + (statMods.skills.cybercombat || 0) || 0,
    software: parseInt($('#skill-software').val()) + (statMods.skills.software || 0) || 0
  };
}

function loadQualities() {
  $.getJSON('qualities.json', function (data) {
    qualities = data;
    const $list = $('#quality-list').empty();
    data.forEach(q => {
      const checkbox = $(`
        <label title="${q.description}">
          <input type="checkbox" value="${q.name}"> ${q.name}
        </label><br>
      `);
      checkbox.find('input').on('change', applyImprovements);
      $list.append(checkbox);
    });
    applyImprovements();
  });
}

function loadPresets() {
  $.getJSON('presets.json', function (data) {
    deckPresets = data;
    const $sel = $('#preset-selector');
    data.forEach(p => {
      $sel.append(`<option value="${p.name}">${p.name}</option>`);
    });
    $sel.on('change', function () {
      const preset = deckPresets.find(p => p.name === this.value);
      if (preset) {
        $('[name="attack"]').val(preset.attack);
        $('[name="sleaze"]').val(preset.sleaze);
        $('[name="dataProcessing"]').val(preset.dataProcessing);
        $('[name="firewall"]').val(preset.firewall);
        saveState();
        applyImprovements();
      }
    });
  });
}

function loadPrograms() {
  $.getJSON('programs.json', function (data) {
    programs = data;
    const $list = $('#program-list').empty();
    data.forEach(p => {
      const prog = $(`<div class="program" draggable="true" title="${p.description}" data-name="${p.name}">${p.name}</div>`);
      $list.append(prog);
    });
    makeProgramsDraggable();
  });
}

function makeProgramsDraggable() {
  $('.program').on('dragstart', function (e) {
    e.originalEvent.dataTransfer.setData('text/plain', $(this).data('name'));
  });
}

function initProgramSlots(count = 3) {
  const $slots = $('#program-slots').empty();
  for (let i = 0; i < count; i++) {
    const slot = $('<div class="program-slot" data-slot="' + i + '"></div>');
    $slots.append(slot);
  }

  $('.program-slot').on('dragover', function (e) {
    e.preventDefault();
  }).on('drop', function (e) {
    e.preventDefault();
    const name = e.originalEvent.dataTransfer.getData('text/plain');
    $(this).text(name).data('program', name);
    saveState();
  });
}

function saveState() {
  const state = {
    deck: {
      attack: $('[name="attack"]').val(),
      sleaze: $('[name="sleaze"]').val(),
      dataProcessing: $('[name="dataProcessing"]').val(),
      firewall: $('[name="firewall"]').val()
    },
    attributes: {
      logic: $('#attr-logic').val(),
      intuition: $('#attr-intuition').val(),
      reaction: $('#attr-reaction').val()
    },
    skills: {
      hacking: $('#skill-hacking').val(),
      computer: $('#skill-computer').val(),
      electronicWarfare: $('#skill-ewarfare').val(),
      cybercombat: $('#skill-cybercombat').val(),
      software: $('#skill-software').val()
    },
    programs: $('.program-slot').map(function () {
      return $(this).data('program') || '';
    }).get(),
    qualities: $('#quality-list input:checked').map(function () {
      return this.value;
    }).get()
  };
  localStorage.setItem('cyberdeckState', JSON.stringify(state));
}

function loadState() {
  const state = JSON.parse(localStorage.getItem('cyberdeckState'));
  if (!state) return;
  $('[name="attack"]').val(state.deck.attack);
  $('[name="sleaze"]').val(state.deck.sleaze);
  $('[name="dataProcessing"]').val(state.deck.dataProcessing);
  $('[name="firewall"]').val(state.deck.firewall);

  $('#attr-logic').val(state.attributes.logic);
  $('#attr-intuition').val(state.attributes.intuition);
  $('#attr-reaction').val(state.attributes.reaction);

  $('#skill-hacking').val(state.skills.hacking);
  $('#skill-computer').val(state.skills.computer);
  $('#skill-ewarfare').val(state.skills.electronicWarfare);
  $('#skill-cybercombat').val(state.skills.cybercombat);
  $('#skill-software').val(state.skills.software);

  $('#quality-list input[type="checkbox"]').each(function () {
    $(this).prop('checked', state.qualities.includes(this.value));
  });

  $('.program-slot').each(function (i) {
    $(this).text(state.programs[i]).data('program', state.programs[i]);
  });

  applyImprovements();
}

$(document).ready(function () {
  loadQualities();
  loadPresets();
  loadPrograms();
  initProgramSlots(3);
  $('#reset-factory').on('click', () => $('#preset-selector').val('').trigger('change'));
  $('input').on('change', () => { applyImprovements(); saveState(); });
  loadState();
});
