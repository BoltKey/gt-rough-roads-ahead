let currScreen = 0;

function setup() {
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



window.addEventListener("load", setup);