'use strict';

/*! A fix for the iOS orientationchange zoom bug. Script by @scottjehl, rebound by @wilto.MIT License.*/(function(m){if(!(/iPhone|iPad|iPod/.test(navigator.platform)&&navigator.userAgent.indexOf("AppleWebKit")>-1)){return}var l=m.document;if(!l.querySelector){return}var n=l.querySelector("meta[name=viewport]"),a=n&&n.getAttribute("content"),k=a+",maximum-scale=1",d=a+",maximum-scale=10",g=true,j,i,h,c;if(!n){return}function f(){n.setAttribute("content",d);g=true}function b(){n.setAttribute("content",k);g=false}function e(o){c=o.accelerationIncludingGravity;j=Math.abs(c.x);i=Math.abs(c.y);h=Math.abs(c.z);if(!m.orientation&&(j>7||((h>6&&i<8||h<8&&i>6)&&j>5))){if(g){b()}}else{if(!g){f()}}}m.addEventListener("orientationchange",f,false);m.addEventListener("devicemotion",e,false)})(this);

const CARD_MINUTES_DELAY = 3;
const CARD_EVENT_DELAY = CARD_MINUTES_DELAY * 60 * 1000;


window.googleDocCallback = function () { return true; };

let app = {
	main: function() {
		/*gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId: '1lImkfyiOBzCVfcOr-XjfZvtrZdXlsprGd-lH9XQux38',
          range: 'Class Data!A2:E',
        }).then(function(response) {
			console.log(response);
		});*/
		/*fetch('https://docs.google.com/spreadsheets/u/0/d/1lImkfyiOBzCVfcOr-XjfZvtrZdXlsprGd-lH9XQux38/gviz/tq?tqx=out:json&callback=googleDocCallback', {method: "GET", mode: "no-cors"}).
		then(function(response) {console.log(response); response.json()}).
		then(response => console.log(response))
		;*/

		document.getElementById("loading").remove();
		document.getElementById("loading-button").style.display = '';
		/*try {
			screen.orientation.lock('landscape');
		}
		catch {
			// sorry
		}*/
		this.noSleep = new NoSleep();
    if (localStorage.getItem("language")) {
      this.lang = localStorage.getItem("language");
    }
    else {
      this.lang = navigator.language.substr(0, 2);
    }
    if (!["en", "de", "cs", "ko", "jp"].includes(this.lang)) {
      this.lang = "en";
    }

		this.cardTimers = {};

		let cardPool = [];
		for (let card in strings.Cards) {
			if (strings.Cards[card].app_status == null
				//&& strings.Cards[card].pic_status == "F"
				) {
				cardPool.push(card);
			}
		}

		this.deck = JSON.parse(localStorage.getItem("deck")) || cardPool;
		this.rondell = JSON.parse(localStorage.getItem("rondell")) || [];
		this.discard = JSON.parse(localStorage.getItem("discard")) || [];

		this.deck = this.deck.filter(x => cardPool.includes(x));
		this.rondell = this.rondell.filter(x => cardPool.includes(x));
		this.discard = this.discard.filter(x => cardPool.includes(x));

		let allCards = this.deck.concat(this.rondell).concat(this.discard);
		let newCards = cardPool.filter(x => !allCards.includes(x));
		this.deck = this.deck.concat(newCards);

		this.fillHelp();

		if (!localStorage.getItem("rondell")) {
			document.getElementById("help-wrap").classList.add("visible");
		}
    for (let name of ['draw-button', 'discard-all-button', 'reshuffle-discard-button', 'help-button']) {
			let button = document.createElement("button");
			button.id = name;

			if (name == 'help-button') {
				document.getElementById("top-bar").appendChild(button);
			}
			else if (name == 'discard-all-button' || name == "reshuffle-discard-button") {
				document.getElementById("button-wrap").appendChild(button);
			}
			else {
				document.getElementById("rough-roads-deck").appendChild(button);
			}
		}
		this.updateButtonStrings();

    for (let expName of ["GT2", "GT3"]) {
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

		document.getElementById("draw-button").addEventListener("click", function(e) {this.drawCard()}.bind(this), this);
		document.getElementById("draw-number").addEventListener("click", function(e) {this.drawCard()}.bind(this), this);
		document.getElementById("discard-all-button").addEventListener("click", function(e) {this.discardAllClick()}.bind(this));
		document.getElementById("lang-select").addEventListener("click", function(e) {this.selectLangClick()}.bind(this));
		document.getElementById("reshuffle-discard-button").addEventListener("click", function(e) {this.reshuffleDiscard()}.bind(this));
		document.getElementById("help-button").addEventListener("click", function(e) {this.helpClick()}.bind(this));
		document.getElementById("discard-number").addEventListener("click", function(e) {this.discardDeckClick()}.bind(this));
		document.getElementById("scenario-picker-logo").addEventListener("click", function(e) {this.changeTab("scenario-picker")}.bind(this));
		document.getElementById("rr-logo").addEventListener("click", function(e) {this.changeTab("rough-roads-deck")}.bind(this));
		document.getElementById("title-page").addEventListener("click", function(e) {
			document.getElementById("title-page").style.opacity = 0;
			window.setTimeout(function() {document.getElementById("title-page").remove(); app.updateRondell();}, /*100*/0);

		});
		document.getElementById("help-wrap").addEventListener("click", function(e) {document.getElementById("help-wrap").classList.remove("visible")} );


		document.getElementById("lang-select").classList.add("lang-select", this.lang);
    for (var e of document.querySelectorAll("#lang-select-wrap .lang-select")) {
      e.addEventListener("click", this.langClick);
    }

		window.addEventListener('resize', function(e) {this.resizeWindow()}.bind(this));
		//window.addEventListener('deviceorientation', function(e) {this.resizeWindow()}.bind(this));

    this.changeLang(this.lang)
		this.resizeWindow();
		this.updateRondell();
	},


  createMissionDisplay: (missionNumber) => {
    let result = document.createElement("div");
    result.classList.add("mission-display");
    let missionText = missionTexts[missionNumber];
    if (!missionText) {
      return result;
    }
    result.innerHTML = "<h2>" + missionText?.title + "</h2><div class='mission-text'>" + missionText?.text + "</div>";
    let image = document.createElement("div");
    image.classList.add("mission-image");
    image.style.backgroundImage = "url(images/cards/" + missionNumber + ".jpg)";
    result.appendChild(image);
    return result;
  },

  updateButtonStrings: function() {
    document.getElementById("discard-all-button").innerHTML = strings.Texts.button_discard["string_" + this.lang];
    document.getElementById("reshuffle-discard-button").innerHTML = strings.Texts.button_reshuffle["string_" + this.lang];
    if (document.getElementById("loading-button")) {
      document.getElementById("loading-button").innerHTML = strings.Texts.button_title["string_" + this.lang];
    }

    document.getElementById("rr-logo").innerHTML = strings.Texts.game_name["string_" + this.lang];
    for (var e of document.querySelectorAll(".localizable")) {
      let id = e.dataset.id;
      if (id && strings.Texts[id]?.["string_" + this.lang]) {
        e.innerHTML = strings.Texts[id]["string_" + this.lang];
      }
    }
  },

  selectLangClick: function() {
    document.getElementById("lang-select-wrap").classList.toggle("visible");
  },
  langClick: function(evt) {
    console.log("clicking ", evt);
    app.changeLang(evt.target.dataset.lang);
    document.getElementById("lang-select-wrap").classList.remove("visible");
  },
  changeLang: function(lang) {
    console.log("changing lang to ", lang);
    localStorage.setItem("language", lang);
    this.lang = lang;
    this.updateButtonStrings();
    this.fillHelp();
    for (var card of document.querySelectorAll(".card-wrap")) {
      card.remove();
    }
    this.updateRondell();
    document.getElementById("lang-select").className = "lang-select " + lang;
    document.body.dataset.lang = lang;

  },

	fillHelp: function() {
		let helpDiv = document.getElementById("help-text");
		for (var par of ["paragraph1", "paragraph2", "paragraph3", "footnote"]) {
			strings.Texts[par]["string_" + this.lang] =
				strings.Texts[par]["string_" + this.lang].replace(
				"[random_extra_hint]",
				//this.currLanguage.hints[Math.floor(Math.random() * this.currLanguage.hints.length)]
				"<span id='extra-hint'></span>"
			).
			replace("[x]", "<span class='x-icon'></span>").
			replace("[+]", "<span class='plus-icon'></span>").
			replace("[i]", "<span class='i-icon'></span>")
			;
		}

		document.querySelector("#help-text h1").innerHTML = strings.Texts.title["string_" + this.lang];
		document.querySelector("#help-text h2").innerHTML = strings.Texts.subtitle["string_" + this.lang];
		for (let paragraph = 1; paragraph <= 3; ++paragraph) {
			document.querySelector("#help-text div:nth-of-type(" + paragraph + ")").innerHTML = strings.Texts["paragraph" + paragraph]["string_" + this.lang];
		}
		document.querySelector("#help-text .footnote").innerHTML = strings.Texts.footnote["string_" + this.lang];
		/*for (let helpNode of helpDiv.children) {
			helpNode.innerHTML = this.currLanguage.help[i++];
		}*/
    let hintNo = Math.floor(Math.random() * 9) + 1;
    document.getElementById("extra-hint").innerHTML = strings.Texts["extra_hint" + hintNo]["string_" + this.lang];
	},
	helpClick: function(evt) {
		document.getElementById("help-wrap").classList.toggle("visible");
		let hintNo = Math.floor(Math.random() * 9) + 1;
		document.getElementById("extra-hint").innerHTML = strings.Texts["extra_hint" + hintNo]["string_" + this.lang];
	},

  helpTextString: function(id) {
    var helpTextString = strings.Cards[id]["clarification_" + this.lang] ;
		if (helpTextString) {
			helpTextString = helpTextString.replaceAll("- ", "")
			helpTextString = helpTextString.replaceAll("\n", "</li><li>");
			helpTextString = "<ul><li>" + helpTextString + "</li></ul>";
      helpTextString = helpTextString.replace("[ship icon]","<div class='ship-icon'></div>");
    }
    return helpTextString;
  },

	createCard: function(id) {
		let addIButton = false;
		let oldCard;
		if (oldCard = document.getElementById("card-" + id)) {
			oldCard.remove();
		}
		let cardWrap = document.createElement("div");
		let helpTextString = null;
		let cardStrings = strings.Cards[id];
    let headerText = "";
    let paragraphText = "";
		if (id != "back") {
			headerText = strings.Cards[id]["name_" + this.lang];
			paragraphText = strings.Cards[id]["text_" + this.lang].replace("[ship icon]", "<div class='ship-icon'></div>");
			//paragraphText = this.currLanguage.cards[id][1];
			cardWrap.id = "card-" + id;
			helpTextString = this.helpTextString(id);
		}

		if (helpTextString) {
			addIButton = true;
		}
		cardWrap.classList.add("card-wrap");

		let rotateWrap = document.createElement("div");
		rotateWrap.classList.add("rotate-wrap");

		let front = document.createElement("div");
		front.classList.add("card-front");
		front.classList.add("card-" + id);

		front.style.backgroundImage = "url(images/cards/" + id + ".jpg)";

		if (addIButton) {
			let iButton = document.createElement("button");
			iButton.classList.add("i-button");
			iButton.dataset.cardId = id;
			iButton.addEventListener("click", function(e) {this.infoClick(e)}.bind(this));
			front.appendChild(iButton);

			let helpText = document.createElement("div");
			helpText.classList.add("help-text");
			helpText.innerHTML = helpTextString;
			front.appendChild(helpText);
		}

		let xButton = document.createElement("button");
		xButton.classList.add("discard-button");
		xButton.dataset.cardId = id;
		xButton.addEventListener("click", function(e) {this.discardClick(e)}.bind(this));
		front.appendChild(xButton);
		front.dataset.id = id;

    let cloud = document.createElement("div");
    cloud.classList.add("cloud");
		let header = document.createElement("h2");
		header.innerHTML = headerText;
		let image = document.createElement("div");
		image.classList.add("card-image");
		let body = document.createElement("p");
		body.innerHTML = paragraphText;

    if (strings.Cards[id]?.ship_icon == "Y") {
      let shipIcon = document.createElement("div");
      shipIcon.classList.add("ship-icon");
      cloud.appendChild(shipIcon);
    }

		cloud.appendChild(header);
		front.appendChild(image);
		cloud.appendChild(body);
    front.appendChild(cloud);

		let back = document.createElement("div");
		back.classList.add("card-back");

		rotateWrap.appendChild(front);
		rotateWrap.appendChild(back);

		cardWrap.appendChild(rotateWrap);
		cardWrap.addEventListener("click", function(e) {this.cardClick(e)}.bind(this));

		cardWrap.dataset.id = id;
		return cardWrap;
	},



	saveState: function() {
		localStorage.setItem("deck", JSON.stringify(this.deck));
		localStorage.setItem("rondell", JSON.stringify(this.rondell));
		localStorage.setItem("discard", JSON.stringify(this.discard));
	},
	shuffle: function(a) {
		//https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
		let currentIndex = a.length, randomIndex;
		while (currentIndex != 0) {
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;
			[a[currentIndex], a[randomIndex]] = [
			a[randomIndex], a[currentIndex]];
		}
		this.saveState();
		return a;
	},
	updateRondell: function() {

		let cardWidth = 1219;
		let scaleFactor = Math.min(window.innerHeight * .6, window.innerWidth) / cardWidth * .8;
		if (this.landscape) {
			scaleFactor *= 1.9;
		}
		let drawButton = document.getElementById("draw-button");
		let discardAllButton = document.getElementById("discard-all-button");
		drawButton.classList.remove("small");
		drawButton.style.top = "40%";

		drawButton.style.width =
			drawButton.style.height = 60 + scaleFactor * 42;
		//discardAllButton.style.top = "80%";

		discardAllButton.classList.add("hidden");
		if (this.rondell.length >= 1) {
			discardAllButton.classList.remove("hidden");
		}

		let reshuffleButton = document.getElementById("reshuffle-discard-button");
		reshuffleButton.classList.add("hidden");
		if (this.discard.length >= 1) {
			reshuffleButton.classList.remove("hidden");
		}

		drawButton.classList.add("hidden");
		if (this.deck.length >= 1 || this.discard.length >= 1) {
			drawButton.classList.remove("hidden");
		}
		drawButton.style.top = (54 -
			scaleFactor * 3 +
			Math.min(this.rondell.length, 5) * 0.7) + "%";
		drawButton.style.width =
			drawButton.style.height = (48 + scaleFactor * 50) * 0.9;
		drawButton.style.left = "50%";
		if (this.landscape && this.rondell.length) {
			drawButton.style.top = "50%";
			drawButton.style.left = "75%";
			if (this.rondell.length == 1) {
				drawButton.style.left = "90%";
			}
		}

		//discardAllButton.style.top = (63.5 + scaleFactor * 12) + "%";

		for (let i in this.rondell) {
			let card = this.rondell[i];
			let cardDiv = document.querySelector("#card-" + card);
			if (!cardDiv) {
				cardDiv = this.createCard(card);
				document.getElementById("rough-roads-deck").appendChild(cardDiv);
			}
			if (i == 0) {
				cardDiv.style.left = "50%";
				cardDiv.style.top = (30 + scaleFactor * 0) + "%";
				let scaleAmt = scaleFactor * 1.2;
				if (this.rondell.length == 1 && this.landscape) {
					scaleAmt *= 1.15;
				}
				cardDiv.style.transform = "translate(-50%, -50%) scale(" + scaleAmt + ")";
				if (this.landscape) {
					cardDiv.style.top = "50%";
					cardDiv.style.left = "45%";
					if (this.rondell.length == 1) {
						cardDiv.style.left = "50%";
					}
				}
				/*let rect = cardDiv.getBoundingClientRect();
				document.getElementById("discard-button").style.left = rect.right;
				document.getElementById("discard-button").style.top = rect.top;*/
			}
			else {
				let helpText = document.querySelector("#card-" + card + " .help-text");
				if (helpText) {
					helpText.classList.remove("visible");
				}
				let scaleMult = [0, 0, 1, 0.8, 0.6][this.rondell.length] || 0.5;
				if (this.rondell.length == 2) {
					scaleMult = 1;
				}
				if (this.rondell.length == 3) {
					scaleMult = 0.8;
				}
				if (this.landscape) {
					scaleMult *= 0.6;
				}
				cardDiv.style.transform = "translate(-50%, -50%) scale(" + (scaleFactor * scaleMult) + ")";
				let ratio;
				if (this.rondell.length == 2) {
					ratio = 0.5
				}
				else {
					ratio = (i-1) / (this.rondell.length - 2);
				}
				if (this.rondell.length == 3) {
					ratio += 0.2 * (ratio < 0.5 ? 1 : -1);
				}
				cardDiv.style.left = (22 + ratio * 56) + "%";
				cardDiv.style.top = (72 - Math.pow(Math.abs(0.5 - ratio) * 4, 2) + scaleFactor * 6) + "%";
				if (this.landscape) {
					cardDiv.style.top = (100 - (22 + ratio * 56)) + "%";
					cardDiv.style.left = (88 - Math.pow(Math.abs(0.5 - ratio) * 4, 2) + scaleFactor * 6) + "%";
				}
				cardDiv.style.zIndex = 100 - i;
			}
		}
		this.updateTimers();

		document.getElementById("draw-number").innerHTML = this.deck.length;
		/*if (this.deck.length) {
			document.getElementById("draw-number").classList.remove("no-cards");
		}
		else {
			document.getElementById("draw-number").classList.add("no-cards");
		}*/
		document.getElementById("discard-number").innerHTML = this.discard.length;

	},
	updateTimers: function() {
		for (var c of this.rondell) {
			if (!this.cardTimers[c]) {
				this.cardTimers[c] = this.makeTimer(c);
			}
		}
		for (var c of Object.keys(this.cardTimers)) {
			if (!this.rondell.includes(c)) {
				window.clearTimeout(this.cardTimers[c]);
				delete this.cardTimers[c];
			}
		}
	},
	makeTimer: function(cardId) {
		return window.setTimeout(
			function() {console.log("sending", cardId); dataLayer.push({'event': 'card-click', "cardId": cardId})},
			CARD_EVENT_DELAY
		);
	},
	cardClick: function(evt) {
		document.getElementById("help-text").classList.remove("visible");
		let cardId = evt.target.dataset.id;
		if (!cardId) {
			return;
		}
		console.log("click card", cardId);
		this.enlargeCard(cardId);

		this.noSleep.enable();

	},
	enlargeCard: function(cardId) {
		let cardIndex = this.rondell.indexOf(cardId);
		this.rondell[cardIndex] = this.rondell[0];
		this.rondell[0] = cardId;

		this.updateRondell();
		this.saveState();
	},
	drawCard: function(evt) {
		document.getElementById("help-text").classList.remove("visible");
		if (this.deck.length == 0) {
			this.reshuffleDiscard();
			if (this.deck.length) {
				window.setTimeout(this.drawCard.bind(this), 1000);
			}
			return;
		}
		if (this.deck.length == 0) {
			return;
		}
		this.shuffle(this.deck);

		let nextId = this.deck.shift();

		console.log("Draw card", nextId);

		this.rondell.unshift(nextId);

		let cardDiv = this.createCard(nextId);
		cardDiv.style.transform = "translate(-50%, -50%) scale(0.3)";
		cardDiv.style.opacity = "0";
		cardDiv.classList.add("flipped");
		cardDiv.style.top = "10%";
		cardDiv.style.left = "10%";
		document.getElementById("rough-roads-deck").appendChild(cardDiv);
		window.setTimeout(function(thisArg) {
			cardDiv.style.transform = "translate(-50%, -50%)";
			cardDiv.style.opacity = "1";
			thisArg.updateRondell();
		}, 50, this);
		window.setTimeout(function() {
			cardDiv.classList.remove("flipped");
		}, 800);
		this.saveState();

		this.noSleep.enable();
	},
	discardClick: function(evt) {
		if (this.rondell.length == 0) {
			return;
		}
		let cardId = evt.target.dataset.cardId;//this.rondell.shift();
		this.rondell.splice(this.rondell.indexOf(cardId), 1);
		this.discard.push(cardId);
		let cardDiv = document.getElementById("card-" + cardId);

		cardDiv.style.opacity = 0;
		cardDiv.style.top = "100%";
		cardDiv.style.left = "0%";
		window.setTimeout(function() {cardDiv.remove();}, 500);
		this.updateRondell();
		this.saveState();
	},
	infoClick: function(evt) {
		let cardId = evt.target.dataset.cardId;
		//if (this.rondell[0] == cardId || this.rondell.length == 2) {
			let helpText = document.querySelector("#card-" + cardId + " .help-text");
			helpText.classList.toggle("visible");
		//}
		this.enlargeCard(cardId);

	},
	discardAllClick: function(evt) {
		for (let c of this.rondell) {
			let cardDiv = document.getElementById("card-" + c);
			window.setTimeout(function() {
				cardDiv.style.opacity = 0;
				cardDiv.style.top = "100%";
				cardDiv.style.left = "0%";
			}, Math.random() * 300);
			window.setTimeout(function() {cardDiv.remove();}, 600);
			this.discard.push(c);
		}
		this.rondell = [];
		this.updateRondell();
		this.saveState();
	},
  changeTab: function(tab) {
    document.querySelectorAll("#rough-roads-deck, #scenario-picker-area, .navigator-tab").forEach(function(e) {
      e.classList.remove("active");
    });
    if (tab == "scenario-picker") {
      document.getElementById("scenario-picker").classList.add("active");
      document.getElementById("scenario-picker-logo").classList.add("active");
      document.getElementById("help-wrap").classList.remove("visible");
    }
    if (tab == "rough-roads-deck") {
      document.getElementById("scenario-picker").classList.remove("active");
      document.getElementById("rr-logo").classList.add("active");
      document.getElementById("help-wrap").classList.remove("visible");
    }
    document.getElementById(tab).classList.add("active");
  },
	discardDeckClick: function(evt) {
		if (this.discard.length == 0) {
			return;
		}
		let nextId = this.discard.pop();
		this.rondell.unshift(nextId);
		let cardDiv = this.createCard(nextId);
		cardDiv.style.transform = "translate(-50%, -50%) scale(0.3)";
		cardDiv.style.opacity = "0";
		cardDiv.classList.add("flipped");
		cardDiv.style.top = "90%";
		cardDiv.style.left = "10%";
		document.getElementById("rough-roads-deck").appendChild(cardDiv);
		window.setTimeout(function(thisArg) {
			cardDiv.style.transform = "translate(-50%, -50%)";
			cardDiv.style.opacity = "1";
			thisArg.updateRondell();
		}, 50, this);
		window.setTimeout(function() {
			cardDiv.classList.remove("flipped");
		}, 800);
		this.saveState();
	},
	reshuffleDiscard: function() {
		for (let i in this.discard) {
			let app = this;
			window.setTimeout(function() {
				app.makeReshuffleCard(i);
			}, i * 50 + Math.random() * 70);

		}
		this.deck = this.deck.concat(this.discard);
		this.discard = [];
		this.shuffle(this.deck);

		this.updateRondell();
	},
	makeReshuffleCard: function() {
		let card = this.createCard("back");
		card.id = "";
		card.dataset.id = "";
		card.style.zIndex = -5;
		card.style.pointerEvents = "none";
		card.classList.add("flipped");
		let discard = document.getElementById("discard-number");
		document.getElementById("rough-roads-deck").appendChild(card);
		card.style.top = "80%";
		card.style.transform = "scale(0.2)";
		card.style.transformOrigin = "top left";
		card.style.left = 0;
		card.style.opacity = 0;
		window.setTimeout(function() {
			card.style.top = "5%";
			card.style.opacity = 1;
		}, 100);
		window.setTimeout(function() {
			card.style.opacity = 0;
		}, 600);
	},
	resizeWindow: function(evt) {

		let aspect = window.innerWidth / window.innerHeight;
		let cutoff = 100.333;
		if (aspect > cutoff) {
			document.body.style.width = window.innerHeight * cutoff + "px";
		}
		else {
			document.body.style.width = "";
		}
		this.landscape = aspect > 1.76;
		document.body.classList.add("portrait");
		document.body.classList.remove("landscape");
		if (this.landscape) {
			document.body.classList.add("landscape");
			document.body.classList.remove("portrait");
		}
		this.updateRondell();
	}
}
window.addEventListener("load", function() {app.main()});


/*function handleClientLoad() {
	gapi.load('client:auth2', initClient);
}

function initClient() {
	gapi.client.init({
	}).then(function () {
	  // Listen for sign-in state changes.
	  gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

	  // Handle the initial sign-in state.
	  updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
	  authorizeButton.onclick = handleAuthClick;
	  signoutButton.onclick = handleSignoutClick;
	}, function(error) {
	  appendPre(JSON.stringify(error, null, 2));
	});
  }*/