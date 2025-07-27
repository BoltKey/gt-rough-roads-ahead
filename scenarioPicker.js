console.log("Loading enhanced scenarioPicker.js with rating history");
let response
let dataExport;

let currScreen = 0;
const activeContract = {}

// Rating history system
const stats = {
  singleNoMissionStats: { frequency: [0, 0], rating: 0, baseValue: 0 },
  trekCustomStats: { frequency: [0, 0], rating: 0, baseValue: 0 },
  trekNoMissionStats: { frequency: [0, 0], rating: 0, baseValue: 0 },
  noVIPStats: { frequency: [0, 0], rating: 0, baseValue: 0 },
  missionStats: {},
  shipStats: {},
  RRStats: {
    0: { frequency: [0, 0], rating: 0, baseValue: 0 },
    1: { frequency: [0, 0], rating: 0, baseValue: 0 },
    2: { frequency: [0, 0], rating: 0, baseValue: 0 },
    3: { frequency: [0, 0], rating: 0, baseValue: 0 }
  }
};

// Rating constants
const ratingConstants = {
  weightKoef: 0.2,
  weightSingleMission: 1.0,
  weightTrekMission: 0.6,
  ratingWeight: 0.8,
  ratingExponentKoef: 2.0,

  // Element weights for rating distribution
  ratingWeight_noMission: 10,
  ratingWeight_mission: 30,
  ratingWeight_noVIP: 5,
  ratingWeight_VIP: 20,
  ratingWeight_noRR: 5,
  ratingWeight_RR: 20,
  ratingWeight_shipBasic: 5,
  ratingWeight_shipOther: 15,

  // Thresholds for rating validity
  ratingThreshold_noMission: 5,
  ratingThreshold_mission: 15,
  ratingThreshold_VIP: 4,
  ratingThreshold_RR: 8,
  ratingThreshold_ship: 4,

  // Evaluation weights
  evalWeight_roughness: 1.0,
  evalWeight_complexity: 1.0,
  evalWeight_historyOffered: [0, 0.25, 0.4, 0.6],
  evalWeight_historyAccepted: [0, 0.25, 0.4, 0.6],
  evalWeight_takeRatingIntoAccount: [0, 0.25, 0.4, 0.6],
  evalWeight_random: 0.2
};

let totalRatings = 0;

async function setup() {
  try {
    response = await fetch('./dataExport.json');
  }
  catch (error) {
    console.error("Error loading dataExport.json:", error);
  }
  console.log("Loading dataExport.json");
  try {
    dataExport = await response.json();
  }
  catch (error) {
    console.error("Error parsing dataExport.json:", error);
  }
  console.log({dataExport})
  console.log("picker setup")

  initializeStats();
  loadStatsFromStorage();

  switchPickerScreen(1)
  bindButtons();
  setupOptions();
}

function initializeStats() {
  // Initialize mission stats
  for (let missionName in dataExport.Missions) {
    if (missionName && missionName !== "" && dataExport.Missions[missionName].frequency !== null) {
      stats.missionStats[missionName] = { frequency: [0, 0], rating: 0, baseValue: 0 };
    }
  }

  // Initialize ship stats
  const ships = ['shipI', 'shipII', 'shipIII', 'shipIA', 'shipIIA', 'shipIIIA'];
  ships.forEach(ship => {
    stats.shipStats[ship] = { frequency: [0, 0], rating: 0, baseValue: 0 };
  });

  setBaseValues();

  // If no history exists, initialize with base values
  const hasHistory = localStorage.getItem('contractStats');
  if (!hasHistory) {
    initStats();
  }
}

function setBaseValues() {
  stats.singleNoMissionStats.baseValue = getSheetConst("perc_NoMission") / 100 || 0.3;
  stats.trekNoMissionStats.baseValue = getSheetConst("perc_NoMission") / 100 || 0.3;
  stats.noVIPStats.baseValue = getSheetConst("perc_NoVIPs") / 100 || 0.4;

  // Mission base values
  const totalMissionFreq = Object.values(dataExport.Missions)
    .filter(m => m.frequency !== null && m.frequency !== undefined)
    .reduce((sum, m) => sum + m.frequency, 0);

  for (let missionName in stats.missionStats) {
    const mission = dataExport.Missions[missionName];
    if (mission && mission.frequency !== null) {
      stats.missionStats[missionName].baseValue = mission.frequency / totalMissionFreq;
    }
  }

  // RR base values
  const totalRRFreq = getFreq("NoRR") + getFreq("RR1") + getFreq("RR2") + getFreq("RR3");
  if (totalRRFreq > 0) {
    stats.RRStats[0].baseValue = getFreq("NoRR") / totalRRFreq;
    stats.RRStats[1].baseValue = getFreq("RR1") / totalRRFreq;
    stats.RRStats[2].baseValue = getFreq("RR2") / totalRRFreq;
    stats.RRStats[3].baseValue = getFreq("RR3") / totalRRFreq;
  }

  // Ship base values (per level)
  for (let level = 1; level <= 3; level++) {
    const levelShips = [`ship${"I".repeat(level)}`, `ship${"I".repeat(level)}A`];
    const totalShipFreq = levelShips.reduce((sum, ship) => sum + getFreq(ship), 0);

    if (totalShipFreq > 0) {
      levelShips.forEach(ship => {
        if (stats.shipStats[ship]) {
          stats.shipStats[ship].baseValue = getFreq(ship) / totalShipFreq;
        }
      });
    }
  }
}

function initStats() {
  function initStat(stat) {
    stat.frequency[0] = stat.baseValue;
    stat.frequency[1] = stat.baseValue;
    stat.rating = 0;
  }

  initStat(stats.singleNoMissionStats);
  initStat(stats.trekNoMissionStats);
  initStat(stats.noVIPStats);

  Object.values(stats.missionStats).forEach(initStat);
  Object.values(stats.shipStats).forEach(initStat);
  Object.values(stats.RRStats).forEach(initStat);
}

function registerStat(stat, accepted, used, weight) {
  const valueToRegister = used ? 1 : 0;
  const w = weight * ratingConstants.weightKoef;
  stat.frequency[accepted ? 1 : 0] = stat.frequency[accepted ? 1 : 0] * (1 - w) + valueToRegister * w;
}

function registerContract(contract, accepted) {
  const isTrek = contract.isTrek || false;

  if (!isTrek) {
    const noMission = !contract.mission || contract.mission === "<no mission>";
    registerStat(stats.singleNoMissionStats, accepted, noMission, 1);
    registerFlight(contract, accepted, ratingConstants.weightSingleMission);
  } else {
    // Trek logic would go here
    const noMission = !contract.mission || contract.mission === "<no mission>";
    registerStat(stats.trekNoMissionStats, accepted, noMission, 1);
    registerFlight(contract, accepted, ratingConstants.weightTrekMission);
  }
}

function registerFlight(flight, accepted, weight) {
  // Register mission
  if (flight.mission && stats.missionStats[flight.mission]) {
    Object.keys(stats.missionStats).forEach(missionName => {
      registerStat(stats.missionStats[missionName], accepted, missionName === flight.mission, weight);
    });
  }

  // Register VIP
  const noVIP = !flight.vip;
  registerStat(stats.noVIPStats, accepted, noVIP, weight);

  // Register ship
  if (flight.ship && stats.shipStats[flight.ship]) {
    const level = flight.flight || flight.level || 1;
    const levelShips = [`ship${"I".repeat(level)}`, `ship${"I".repeat(level)}A`];
    levelShips.forEach(shipName => {
      if (stats.shipStats[shipName]) {
        registerStat(stats.shipStats[shipName], accepted, shipName === flight.ship, weight);
      }
    });
  }

  // Register RR
  const rrCount = flight["num-rr"] || 0;
  for (let r = 0; r <= 3; r++) {
    registerStat(stats.RRStats[r], accepted, r === rrCount, weight);
  }
}

function applyRating(origRating, actRating, threshold, relWeight, ratingCount) {
  const validity = Math.min(1, ratingCount / threshold);
  const w = ratingConstants.ratingWeight * validity * relWeight;
  return (1 - w) * origRating + w * actRating;
}

function applyContractRating(contract, rating) {
  totalRatings++;

  // Define contract elements and their properties
  const elements = [
    {
      key: contract.mission && contract.mission !== "<no mission>" ? "mission" : "noMission",
      stat: contract.mission && contract.mission !== "<no mission>" ? stats.missionStats[contract.mission] : stats.singleNoMissionStats,
      weight: contract.mission && contract.mission !== "<no mission>" ? ratingConstants.ratingWeight_mission : ratingConstants.ratingWeight_noMission,
      threshold: contract.mission && contract.mission !== "<no mission>" ? ratingConstants.ratingThreshold_mission : ratingConstants.ratingThreshold_noMission,
      enabled: true
    },
    {
      key: contract.vip ? "VIP" : "noVIP",
      stat: contract.vip ? null : stats.noVIPStats,
      weight: contract.vip ? ratingConstants.ratingWeight_VIP : ratingConstants.ratingWeight_noVIP,
      threshold: contract.vip ? ratingConstants.ratingThreshold_VIP : ratingConstants.ratingThreshold_VIP,
      enabled: !contract.vip // Only apply rating to noVIPStats if not VIP
    },
    {
      key: (contract["num-rr"] || 0) > 0 ? "RR" : "noRR",
      stat: stats.RRStats[contract["num-rr"] || 0],
      weight: (contract["num-rr"] || 0) > 0 ? ratingConstants.ratingWeight_RR : ratingConstants.ratingWeight_noRR,
      threshold: ratingConstants.ratingThreshold_RR,
      enabled: true
    },
    {
      key: (!contract.ship || !contract.ship.includes('A')) ? "shipBasic" : "shipOther",
      stat: contract.ship ? stats.shipStats[contract.ship] : null,
      weight: (!contract.ship || !contract.ship.includes('A')) ? ratingConstants.ratingWeight_shipBasic : ratingConstants.ratingWeight_shipOther,
      threshold: ratingConstants.ratingThreshold_ship,
      enabled: !!contract.ship
    }
  ];

  // Calculate total weight
  const totalWeight = elements.reduce((sum, el) => sum + (el.enabled ? el.weight : 0), 0);

  // Apply ratings
  elements.forEach(el => {
    if (el.enabled && el.stat) {
      const relWeight = el.weight / totalWeight;
      el.stat.rating = applyRating(
        el.stat.rating,
        rating,
        el.threshold,
        relWeight,
        totalRatings
      );
    }
  });

  saveStatsToStorage();
}

function getDesire(stat) {
  const ratingExponent = Math.pow(2, -stat.rating * ratingConstants.ratingExponentKoef);
  const idealRatio = Math.pow(stat.baseValue, ratingExponent);

  return {
    offered: stat.frequency[0] > 0 ? idealRatio / stat.frequency[0] : 1,
    accepted: stat.frequency[1] > 0 ? idealRatio / stat.frequency[1] : 1
  };
}

function getContractDesire(contract) {
  let desireOffered = 1;
  let desireAccepted = 1;
  let count = 0;

  // Mission desire
  if (contract.mission && contract.mission !== "<no mission>" && stats.missionStats[contract.mission]) {
    const desire = getDesire(stats.missionStats[contract.mission]);
    desireOffered *= desire.offered;
    desireAccepted *= desire.accepted;
    count++;
  } else {
    const desire = getDesire(stats.singleNoMissionStats);
    desireOffered *= desire.offered;
    desireAccepted *= desire.accepted;
    count++;
  }

  // VIP desire
  if (!contract.vip) {
    const desire = getDesire(stats.noVIPStats);
    desireOffered *= desire.offered;
    desireAccepted *= desire.accepted;
    count++;
  }

  // RR desire
  const rrCount = contract["num-rr"] || 0;
  if (stats.RRStats[rrCount]) {
    const desire = getDesire(stats.RRStats[rrCount]);
    desireOffered *= desire.offered;
    desireAccepted *= desire.accepted;
    count++;
  }

  // Ship desire
  if (contract.ship && stats.shipStats[contract.ship]) {
    const desire = getDesire(stats.shipStats[contract.ship]);
    desireOffered *= desire.offered;
    desireAccepted *= desire.accepted;
    count++;
  }

  // Return geometric average
  return {
    offered: count > 0 ? Math.pow(desireOffered, 1/count) : 1,
    accepted: count > 0 ? Math.pow(desireAccepted, 1/count) : 1
  };
}

function saveStatsToStorage() {
  localStorage.setItem('contractStats', JSON.stringify(stats));
  localStorage.setItem('totalRatings', totalRatings.toString());
}

function loadStatsFromStorage() {
  const savedStats = localStorage.getItem('contractStats');
  const savedRatings = localStorage.getItem('totalRatings');

  if (savedStats) {
    try {
      const loadedStats = JSON.parse(savedStats);
      // Merge loaded stats with initialized structure
      Object.keys(stats).forEach(key => {
        if (loadedStats[key]) {
          Object.assign(stats[key], loadedStats[key]);
        }
      });
    } catch (e) {
      console.error('Error loading stats from storage:', e);
    }
  }

  if (savedRatings) {
    totalRatings = parseInt(savedRatings) || 0;
  }
}

function setupDoubleRange(minId, maxId, valuesId) {
  const minInput = document.getElementById(minId);
  const maxInput = document.getElementById(maxId);
  const rangeValues = document.getElementById(valuesId);
  function updateRange(evt) {
    console.log("updating range", minInput.value, maxInput.value);
    let min = Math.min(Number(minInput.value), Number(maxInput.value));
    let max = Math.max(Number(minInput.value), Number(maxInput.value));
    minInput.value = min;
    maxInput.value = max;
    let textContent = `${getContractAttrLabel(minInput.name.slice(0, -4), undefined, min)} to ${getContractAttrLabel(maxInput.name.slice(0, -4), undefined, max)}`;
    if (min === max) {
      textContent = getContractAttrLabel(minInput.name.slice(0, -4), undefined, min);
    }
    rangeValues.textContent = textContent;
  }
  minInput.addEventListener('input', updateRange);
  maxInput.addEventListener('input', updateRange);
  updateRange();
}

function setupOptions() {
  var gt2Checkbox = document.getElementById('use-GT2');
  var gt2ShipOptions = document.getElementById('gt2-ship-options');
  var shipSelects = document.querySelectorAll('.ship-select');
  function updateGT2Options() {
    if (gt2Checkbox && gt2Checkbox.checked) {
      gt2ShipOptions.style.display = '';
      // Add GT2 options if not already present
      shipSelects.forEach(function(select) {
        if (!select.querySelector('option[value="ship-IA"]')) {
          Array.from(gt2ShipOptions.children).forEach(function(opt) {
            select.appendChild(opt.cloneNode(true));
          });
        }
      });
    } else {
      gt2ShipOptions.style.display = 'none';
      // Remove GT2 options
      shipSelects.forEach(function(select) {
        ['ship-IA', 'ship-IB', 'ship-IC'].forEach(function(val) {
          var opt = select.querySelector('option[value="' + val + '"]');
          if (opt) select.removeChild(opt);
        });
      });
    }
  }
  for (let name of ["gt-option-ships", "gt2-option-ships"]) {
    const setting = document.querySelector(`#${name}`);
    setting.addEventListener("change", (evt) => {
      if (!evt.target.checked) {
        const otherSetting = ["gt-option-ships", "gt2-option-ships"].find(n => n !== name);
        document.querySelectorAll(`#${otherSetting}`).forEach(el => {
          el.checked = true;
        });
      }
    });
  }
  for (let name of ["have-digital-rr", "gt2-option-rr"]) {
    const setting = document.querySelector(`#${name}`);
    setting.addEventListener("change", (evt) => {
      if (evt.target.checked) {
        const otherSetting = ["have-digital-rr", "gt2-option-rr"].find(n => n !== name);
        document.querySelectorAll(`#${otherSetting}`).forEach(el => {
          el.checked = false;
        });
      }
    });
  }
  for (let missionName in dataExport.Missions) {
    let option = document.createElement('option');
    option.value = missionName;
    option.textContent = missionName;
    document.querySelectorAll('.mission-select').forEach(select => {
      select.appendChild(option.cloneNode(true));
    });
  }
  for (let changeInput of document.querySelectorAll('.contract-change')) {
    changeInput.addEventListener('change', (evt) => {
      updateContract({
        [evt.target.name]: evt.target.type === "checkbox" ? evt.target.checked : evt.target.value
      });
    });
  }
  for (let rating of document.querySelectorAll('.rating-button')) {
    rating.addEventListener('click', (evt) => {
      evt.target.classList.toggle('selected');
      for (let other of document.querySelectorAll('.rating-button')) {
        if (other !== evt.target) {
          other.classList.remove('selected');
        }
      }
    });
  }
  document.querySelector("#rating-confirm").addEventListener('click', (evt) => {
    const selectedRating = document.querySelector('.rating-button.selected');
    if (selectedRating) {
      const rating = parseInt(selectedRating.dataset.rating) || 0;
      applyContractRating(activeContract, rating);
      console.log('Applied rating:', rating, 'to contract:', activeContract);
    }
    switchPickerScreen("3");
  });
  if (gt2Checkbox) {
    gt2Checkbox.addEventListener('change', updateGT2Options);
    updateGT2Options();
  }

  for (let expName of ["digital-rr", "GT", "GT2", "GT3"]) {
    let checkbox = document.getElementById('have-' + expName);
    let image = document.getElementById('have-' + expName + '-img');

    checkbox?.addEventListener('change', () => {
      image.classList.toggle('picked', checkbox.checked);
    });
  }
  for (let shipName of ["1", "2", "3", "3a"]) {
    let checkbox = document.getElementById('ship-' + shipName);
    let image = document.getElementById('ship-' + shipName + '-img');

    checkbox?.addEventListener('change', () => {
      image.classList.toggle('picked', checkbox.checked);
    });
  }
  setupDoubleRange('complexity-min', 'complexity-max', 'complexity-values');
  setupDoubleRange('roughness-min', 'roughness-max', 'roughness-values');
}

function getContractAttrLabel(attr, value, level) {
  const labels = {
    complexity: [
      "simple",
      "simple",
      "not that complex",
      "rather complex",
      "complex",
      "very complex",
      "more than very complex",
    ],
    roughness: [
      "not that harsh",
      "not that harsh",
      "harsh",
      "very harsh",
      "extremely harsh",
      "ultimately harsh",
      "more than ultimately harsh",
    ]
  };
  if (level !== undefined) {
    return labels[attr][level];
  }
  let result = labels[attr][0];
  for (let threshold of "0123456") {
    if (getSheetConst(`${attr}_${threshold}`) > value || threshold === "6") {
      return labels[attr][threshold];
    }
  }
}

function updateContract(contract) {
  Object.assign(activeContract, contract);
  addAttrsToContract(activeContract);
  console.log("Updating contract:", activeContract);
  for (let [targetQuery, inputQuery, content, inputContent] of [
    [".ship-icon-selected, .ship-big-image", ".ship-select", activeContract.ship],
    [".mission-name", ".mission-select", activeContract.mission],
    [".vip-status", ".use-vips", activeContract.vip === undefined ? undefined : (activeContract.vip ? "Play VIPs" : "Don't play VIPs"), contract.vip],
    [".rr-amount", ".num-rr", activeContract["num-rr"]],
    [".fit-value", "", activeContract.fit?.toFixed(2)],
    [".complexity-value", "", activeContract.complexity],
    [".roughness-value", "", activeContract.roughness],
    ["#contract-complexity", "", getContractAttrLabel("complexity", activeContract.complexity)],
    ["#contract-roughness", "", getContractAttrLabel("roughness", activeContract.roughness)],
  ]) {
    if (content === null || content === undefined) {
      continue;
    }
    if (inputContent === undefined) {
      inputContent = content;
    }
    if (inputQuery === ".ship-select") {
      document.querySelectorAll(targetQuery).forEach(el => {
        el.dataset.ship = content;
      });
      document.querySelector(".popup-ship .popup-text").textContent = {
        "shipI": "Small standard ship.",
        "shipII": "Medium sized standard ship.",
        "shipIII": "Large standard ship.",
        "shipIA": `Small and dense ship that attracts projectiles - columns have multiple numbers so it is hard to miss this ship.
At the start of the flight, roll a die to determine which direction will be the ship rotated (where will be front).`,
        "shipIIA": `Medium sized ship with an experimental feature: The projectiles comming from the front and rear are symetrically doubled.
(There are two columns with numbers 4, 5, 6, 8, 9 and 10, so when this number is rolled for the column, the meteor or cannon fire comes in both these columns.)`,
        "shipIIIA": `Large ship that bends space: The projectiles from the front and rear that would miss hit the sides of the ship instead.
(If you roll 2, 3, 4 or 10, 11, 12 for meteors or cannon fire from the front or rear, consider the projectile to come from the side instead, as the arrows sugest.)`,
      }[content] || "Unknown ship";
    }
    else {
      let textContent = content;
      if (targetQuery === ".mission-name") {
        if (textContent === "<no mission>") {
          textContent = "no mission";
        }
        else {
          textContent = "mission " + content;
        }
      }
      document.querySelectorAll(targetQuery).forEach(el => {
        el.textContent = textContent;
      });
    }
    if (inputQuery === "") {
      continue;
    }
    document.querySelectorAll(inputQuery).forEach(el => {
      if (el.type === "checkbox") {
        el.checked = inputContent;
      }
      else {
        el.value = inputContent;
      }
    });
  }
  for (let instruction of document.querySelectorAll(".instructions")) {
    instruction.classList.add("hidden");
  }
  for (let instruction of ["ship", "mission", "vip", "rr"]) {
    let query = `.${instruction}-instructions`;
    if (instruction === "ship") {
      query += ` .${activeContract.ship}`;
    }
    const instructionTexts = document.querySelectorAll(query);
    if (instructionTexts) {
      instructionTexts.forEach(instructionText => {
        instructionText.classList.add("hidden");
        if (activeContract[instruction] && activeContract[instruction] !== "<no mission>") {  // consider all falsy values including 0 (for rr)
          instructionText.classList.remove("hidden");
        }
      });
    }
  }
  document.querySelector(".credits-amt").textContent = activeContract.flight * 10;
}

function switchPickerScreen(id) {
  for (let screen of document.querySelectorAll(".picker-screen")) {
    screen.classList.add("hidden")
    let targetId = id;
    if (id === "decline") {
      targetId = "contract";
    }
    if (screen.classList.contains("picker-screen-" + targetId)) {
      screen.classList.remove("hidden")
    }
  }
  if (id === "contract" || id === "decline") {
    const contract = getContract();
    console.log("Selected contract:", contract);

    Object.assign(activeContract, contract);
    updateContract(contract);
  }
  if (id === "loading") {
    const loadingScreen = document.querySelector(".picker-screen-loading");
    loadingScreen.classList.remove("hidden");
    setTimeout(() => {
      loadingScreen.classList.add("hidden");
      switchPickerScreen("contract");
    }, 500); // Simulate loading time
  }
  if (id === "launch") {
    registerContract(activeContract, true);
    console.log('Contract accepted and registered:', activeContract);
  }
}

function bindButtons() {
  for (let button of document.querySelectorAll("input[name='continue'], button.contract-navigation")) {
    button.addEventListener("click", (evt) => {
      switchPickerScreen(evt.target.dataset.next)
    })
  }
  for (let button of document.querySelectorAll(".i-button")) {
    button.addEventListener("click", (evt) => {
      togglePopup(evt.target.dataset.tab)
    })
  }
  for (let popup of document.querySelectorAll(".close-popup")) {
    popup.addEventListener("click", (evt) => {
      for (let popup of document.querySelectorAll(".popup")) {
        popup.classList.add("hidden")
      }
    })
  }
}

function togglePopup(tab) {
  for (let popup of document.querySelectorAll(".popup")) {
    popup.classList.add("hidden")
    if (popup.classList.contains("popup-" + tab)) {
      popup.classList.remove("hidden")
    }
  }
}

function getSheetConst(constName) {
  return dataExport.Constants[constName]?.value || null;
}

function getSetting(constName) {
  const setting = document.querySelector(`#${constName}`);
  if (!setting) {
    console.warn(`Setting ${constName} not found`);
    return null;
  }
  if (setting.type === "checkbox") {
    return setting.checked ? "on" : "off";
  }
  return setting ? setting.value : null;
}

function getFreq(constName) {
  return getSheetConst("freq_" + constName) || 0;
}

function getPc(constName) {
  return getSheetConst("perc_" + constName) / 100 || 0;
}

function getContractFit(contract) {
  const attrs = getContractAttrs(contract);
  const minComplexity = getSheetConst("complexity_" + getSetting("complexity-min")) || 0;
  const maxComplexity = getSheetConst("complexity_" + getSetting("complexity-max")) || 5;
  const minRoughness = getSheetConst("roughness_" + getSetting("roughness-min")) || 0;
  const maxRoughness = getSheetConst("roughness_" + getSetting("roughness-max")) || 5;

  // Complexity compliance
  let complexityCompliance = 1;
  if (attrs.complexity < minComplexity) {
    complexityCompliance *= attrs.complexity / minComplexity;
  }
  if (attrs.complexity > maxComplexity) {
    complexityCompliance *= maxComplexity / attrs.complexity;
  }

  // Roughness compliance
  let roughnessCompliance = 1;
  if (attrs.roughness < minRoughness) {
    roughnessCompliance *= attrs.roughness / minRoughness;
  }
  if (attrs.roughness > maxRoughness) {
    roughnessCompliance *= maxRoughness / attrs.roughness;
  }

  // Random element
  const randomElement = Math.pow(2, Math.random() * 2 - 1);


  // Get history weight settings (0-1 scale from UI)
  const offeredSetting = getSetting("history-offered-weight") || 0;
  const acceptedSetting = getSetting("history-accepted-weight") || 0;
  const takeRatingIntoAccount = getSetting("history-take-rating") || 0;

  const offeredWeight = ratingConstants.evalWeight_historyOffered[offeredSetting] || 0.25;
  const acceptedWeight = ratingConstants.evalWeight_historyAccepted[acceptedSetting] || 0.25;
  const takeRatingIntoAccountWeight = ratingConstants.evalWeight_takeRatingIntoAccount[takeRatingIntoAccount] || 1;
  // Contract desire (history-based evaluation)
  const contractDesire = Math.pow(getContractDesire(contract), takeRatingIntoAccountWeight);

  // Enhanced evaluation with history
  const result = Math.pow(complexityCompliance, ratingConstants.evalWeight_complexity) *
    Math.pow(roughnessCompliance, ratingConstants.evalWeight_roughness) *
    Math.pow(contractDesire.offered, offeredWeight) *
    Math.pow(contractDesire.accepted, acceptedWeight) *
    Math.pow(randomElement, ratingConstants.evalWeight_random);

  return result;
}

function getContractAttrs(contract) {
  let missionAttrs = dataExport.Missions[contract.mission] || {};
  let result = {}
  for (let key of ["C", "R"]) {
    let attrValue = 1
    if (key === "C") {
      attrValue = 0;
    }
    let attrs = [""]
    if (contract.ship) {
      attrs.push(contract.ship);
    }
    if (contract.vip) {
      attrs.push("VIP");
    }
    if (contract["num-rr"] > 0) {
      attrs.push("RR " + contract["num-rr"] + " cards");
    }
    for (let attr of attrs) {
      if (key === "C") {
        attrValue += (missionAttrs[attr + key] - 100) || 0;
      }
      else {
        attrValue *= missionAttrs[attr + key] / 100 || 1;
      }
    }
    result[key] = attrValue;
  }
  return {
    complexity: result.C,
    roughness: result.R * 100,
  };
}

function randomContract() {
  let possibleLevels = [];
  for (let level of [1, 2, 3]) {
    if (getSetting("level-" + level) === "on") {
      possibleLevels.push(level);
    }
  }
  const pickedFlight = possibleLevels[Math.floor(Math.random() * possibleLevels.length)];
  const noMission = getSetting("gt2-option-missions") === "off";
  const missions = Object.entries(dataExport.Missions).filter(m => !m[1].flags?.includes("not" + pickedFlight)).map(m => {
    return {
      name: m[0],
      props: m[1]
    };
  });
  let mission = missions.find(m => m.name === "<no mission>") || null;
  if (!noMission) {
    const totalFreq = missions.reduce((sum, m) => sum + m.props.frequency, 0);
    if (totalFreq > 0) {
      const rand = Math.random() * totalFreq;
      let cumulative = 0;
      for (const m of missions) {
        cumulative += m.props.frequency;
        if (rand < cumulative) {
          mission = m;
          break;
        }
      }
    }
  }

  const possibleShips = [];
  if (getSetting("gt-option-ships") === "on") {
    possibleShips.push("ship" + "I".repeat(+pickedFlight));
  }
  if (getSetting("gt2-option-ships") === "on") {
    possibleShips.push("ship" + "I".repeat(+pickedFlight) + "A");
  }
  const totalFreq = possibleShips.reduce((sum, ship) => sum + getFreq(ship), 0);
  let ship = null;
  if (totalFreq > 0) {
    const rand = Math.random() * totalFreq;
    let cumulative = 0;
    for (const shipName of possibleShips) {
      cumulative += getFreq(shipName);
      if (rand < cumulative) {
        ship = shipName;
        break;
      }
    }
  }
  let vip = false;
  if (Math.random() < getFreq("VIP")) {
    vip = true;
  }
  else if (getSetting("gt2-option-vip") === "off") {
    vip = false;
  }
  else {
    vip = Math.random() < getPc("NoVIPs");
  }
  let roughRoads = 2;
  if (getSetting("have-digital-rr") === "off" && getSetting("gt2-option-rr") === "off") {
    roughRoads = 0;
  }
  else {
    const totalFreq = getFreq("NoRR") + getFreq("RR1") + getFreq("RR2") + getFreq("RR3");
    if (totalFreq > 0) {
      const rand = Math.random() * totalFreq;
      if (rand < getFreq("NoRR")) {
        roughRoads = 0;
      } else if (rand < getFreq("NoRR") + getFreq("RR1")) {
        roughRoads = 1;
      } else if (rand < getFreq("NoRR") + getFreq("RR1") + getFreq("RR2")) {
        roughRoads = 2;
      } else {
        roughRoads = 3;
      }
    }
  }
  let contract = {
    mission: mission.name,
    ship,
    flight: pickedFlight,
    vip,
    "num-rr": roughRoads,
  };
  return contract;
}

function getContract() {
  let candidate = null;
  const attempts = getSheetConst("singleFlightAttempts") || 25;

  for (let i = 0; i < attempts; i++) {
    const contract = randomContract();
    contract.fit = getContractFit(contract);
    if (!candidate || contract.fit >= candidate.fit) {
      candidate = contract;
    }
  }

  // Register this contract as offered
  registerContract(candidate, false);
  addAttrsToContract(candidate);

  console.log('Generated contract with fit:', candidate.fit, candidate);
  return candidate;
}

function addAttrsToContract(contract) {
  const attrs = getContractAttrs(contract);
  Object.assign(contract, attrs);
}

// Debug function to view current stats
function viewStats() {
  console.log('Current stats:', stats);
  console.log('Total ratings:', totalRatings);

  // Show some interesting derived values
  console.log('Contract desires for sample elements:');
  Object.keys(stats.missionStats).slice(0, 3).forEach(mission => {
    const desire = getDesire(stats.missionStats[mission]);
    console.log(`${mission}: offered=${desire.offered.toFixed(2)}, accepted=${desire.accepted.toFixed(2)}, rating=${stats.missionStats[mission].rating.toFixed(2)}`);
  });
}

// Expose debug function globally
window.viewStats = viewStats;

window.addEventListener("load", setup);

export {
  getContract,
  viewStats,
  applyContractRating,
  stats
};