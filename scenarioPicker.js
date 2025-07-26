console.log("Loading scenarioPicker.js");
let response
let dataExport;


let currScreen = 0;

const activeContract = {}

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
  debugger
  switchPickerScreen(1)
  bindButtons();
  setupOptions();
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
      saveContractRating()
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

function saveContractRating(contract, rating) {
  const history = JSON.parse(localStorage.getItem("contractRatings")) || [];
  history.push({ contract, rating });
  localStorage.setItem("contractRatings", JSON.stringify(history));
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
    recordContractAccepted(activeContract);
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
  let complexityCompliance = 1;
  if (attrs.complexity < minComplexity) {
    complexityCompliance *= attrs.complexity / minComplexity;
  }
  if (attrs.complexity > maxComplexity) {
    complexityCompliance *= maxComplexity / attrs.complexity;
  }
  let roughnessCompliance = 1;
  if (attrs.roughness < minRoughness) {
    roughnessCompliance *= attrs.roughness / minRoughness;
  }
  if (attrs.roughness > maxRoughness) {
    roughnessCompliance *= maxRoughness / attrs.roughness;
  }
  let randomElement = Math.pow(2, Math.random() * 2 - 1);

  return Math.pow(complexityCompliance, 1) *
  Math.pow(roughnessCompliance, 1) *
  Math.pow(randomElement, 0.2);
}

function getContractAttrs(contract) {
  let missionAttrs = dataExport.Missions[contract.mission] || {};
  let result = {}
  for (let key of ["C", "R"]) {
    let attrValue = 1
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
        attrValue += missionAttrs[attr + key] || 0;
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

function recordContractOffered(contract) {
  const weight = 1;
  registerStat("ship" + contract.ship, false, true, weight);
  registerStat("mission" + contract.mission, false, true, weight);
  registerStat("VIP", false, contract.vip, weight);
  registerStat("RR" + contract["num-rr"], false, true, weight);
}

function recordContractAccepted(contract) {
  const weight = getSheetConst("weight_singleMission"); // or weight_trekMission
  registerStat("ship" + contract.ship, true, true, weight);
  registerStat("mission" + contract.mission, true, true, weight);
  registerStat("VIP", true, contract.vip, weight);
  registerStat("RR" + contract["num-rr"], true, true, weight);
}

function registerStat(statName, accepted, used, weight) {
  const weightKoef = getSheetConst("weight_koef") || 0.2;
  const key = `${statName}:${accepted ? "accepted" : "offered"}`;
  let value = parseFloat(localStorage.getItem(key)) || 0;
  const target = used ? 1 : 0;
  value = value * (1 - weight * weightKoef) + target * (weight * weightKoef);
  localStorage.setItem(key, value);
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
  for (let i = 0; i < getSheetConst("singleFlightAttempts"); i++) {
    const contract = randomContract();
    contract.fit = getContractFit(contract);
    if (!candidate || contract.fit >= candidate.fit) {
      candidate = contract;
    }
  }
  recordContractOffered(candidate);
  addAttrsToContract(candidate);
  return candidate;
}

function addAttrsToContract(contract) {
  const attrs = getContractAttrs(contract);
  Object.assign(contract, attrs);
}


window.addEventListener("load", setup);

export {
  getContract
};