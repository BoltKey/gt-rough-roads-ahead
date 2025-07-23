console.log("Loading scenarioPicker.js");
let response
let dataExport;


let currScreen = 0;

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
  console.log("picker setup")
  debugger
  switchPickerScreen(1)
  bindButtons();
  setupOptions();
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
  if (gt2Checkbox) {
    gt2Checkbox.addEventListener('change', updateGT2Options);
    updateGT2Options();
  }
}

function switchPickerScreen(id) {
  for (let screen of document.querySelectorAll(".picker-screen")) {
    screen.classList.add("hidden")
    if (screen.classList.contains("picker-screen-" + id)) {
      screen.classList.remove("hidden")
    }
  }
  if (id === "contract") {
    const contract = getContract();
    console.log("Selected contract:", contract);
    for (let [targetQuery, content] of [
      [".ship-icon-selected", contract.ship || "None"],
      [".mission-name", contract.mission ?? "None"],
      [".vip-status", contract.vip ? "Play VIPs" : "Don't play VIPs"],
      [".rr-amount", contract.roughRoads],
      [".fit-value", contract.fit.toFixed(2)],
      [".complexity-value", contract.complexity],
      [".roughness-value", contract.roughness]
    ]) {
      document.querySelectorAll(targetQuery).forEach(el => {
        el.textContent = content;
      });
    }
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
  if (setting.checked !== undefined) {
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
  return Math.random();
}

function getContractAttrs(contract) {
  return {
    complexity: 10, // Placeholder for complexity calculation
    roughness: 10, // Placeholder for roughness calculation
  }; // Placeholder for contract fit calculation
}

function addContractToHistory(contract) {
  const history = JSON.parse(localStorage.getItem("contractHistory")) || [];
  history.push(contract);
  localStorage.setItem("contractHistory", JSON.stringify(history));
}

function randomContract() {
  const pickedFlight = 2; // evenly random from selected
  const noMission = getSetting("gt2-option-missions") === "off";
  let mission = null;
  if (!noMission) {
    const missions = Object.entries(dataExport.Missions).filter(m => !m[1].flags?.includes("not" + pickedFlight)).map(m => {
      return {
        name: m[0],
        props: m[1]
      };
    });
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
    possibleShips.push("ship" + pickedFlight);
  }
  if (getSetting("gt2-option-ships") === "on") {
    possibleShips.push("ship" + pickedFlight + "A");
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
  else if (getSetting("gt2-option-vip") === "false") {
    vip = false;
  }
  else {
    vip = Math.random() < getPc("NoVIPs");
  }
  let roughRoads = 2;
  if (getSetting("digital-rr") === "false" && getSetting("gt2-option-rr") === "false") {
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
    vip,
    roughRoads,
  };
  return contract;
}

function getContract() {
  let candidate = null;
  for (let i = 0; i < getSheetConst("singleFlightAttempts"); i++) {
    const contract = randomContract();
    const fit = getContractFit(contract);
    if (fit >= getSheetConst("minContractFit")) {
      candidate = contract;
    }
  }
  addContractToHistory(candidate);
  const attrs = getContractAttrs(candidate);
  return {
    ...candidate,
    fit: getContractFit(candidate),
    complexity: attrs.complexity,
    roughness: attrs.roughness,
  };
}





window.addEventListener("load", setup);

export {
  getContract
};