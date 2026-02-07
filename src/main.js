import "./style.css";
import { parseElement, randomFrom } from "./utils/common.ts";
import { clearAllData, loadData, saveData } from "./utils/storage.ts";

const isDesktop = !navigator.userAgent.match(
	/(ipad|iphone|ipod|android|windows phone)/i,
);

function initStyle() {
	let fontunit = isDesktop
		? 20
		: ((window.innerWidth > window.innerHeight
				? window.innerHeight
				: window.innerWidth) /
				320) *
			10;
	if (fontunit > 30) fontunit = 30;

	const style = document.createElement("style");
	let cssText = `html,body {font-size:${fontunit}px;}`;

	if (isDesktop) {
		cssText +=
			"#welcome,#GameTimeLayer,#GameLayerBG,#GameScoreLayer.SHADE{position: absolute;}";
	} else {
		cssText +=
			"#welcome,#GameTimeLayer,#GameLayerBG,#GameScoreLayer.SHADE{position:fixed;}";
		cssText +=
			"@media screen and (orientation:landscape) {#landscape {display: flex;}}";
	}

	style.innerHTML = cssText;
	document.head.appendChild(style);
}
let map = { d: 1, f: 2, j: 3, k: 4 };
let key = ["!"];
const chs = ["@", "!", "#", "&", "+", "-", "%", "*"];
let len = key.length;
let hide = false;
let __Time = 20;
let __k = 4;
let _close = false;
let _fsj = false;
var url = "/image/ClickBefore.png";

function isplaying() {
	return (
		document.getElementById("welcome").style.display == "none" &&
		document.getElementById("GameScoreLayer").style.display == "none" &&
		document.getElementById("setting1").style.display == "none"
	);
}

function gl() {
	const tmp = [];
	len = key.length;
	var i = 0;
	for (let i = 0; i < len; ++i) {
		if (chs.includes(key[i]) || (key[i] >= "1" && key[i] <= __k.toString())) {
			tmp.push(key[i]);
		} else if (key[i] == "！") {
			tmp.push("!");
		}
	}
	key = tmp;
	if (key.length == 0) {
		key = ["!"];
	}
	len = key.length;
}

let body,
	blockSize,
	GameLayer = [],
	GameLayerBG,
	touchArea = [],
	GameTimeLayer;
let transform, transitionDuration;

function init() {
	initStyle();

	var container = document.getElementById("gameBody") || document.body;
	if (!document.getElementById("GameLayerBG")) {
		container.insertAdjacentHTML("beforeend", createGameLayer());
	}
	showWelcomeLayer();
	body = document.getElementById("gameBody") || document.body;
	body.style.height = window.innerHeight + "px";
	transform =
		typeof body.style.webkitTransform != "undefined"
			? "webkitTransform"
			: typeof body.style.msTransform != "undefined"
				? "msTransform"
				: "transform";
	transitionDuration = transform.replace(/ransform/g, "ransitionDuration");
	GameTimeLayer = document.getElementById("GameTimeLayer");
	GameLayer.push(document.getElementById("GameLayer1"));
	GameLayer.push(document.getElementById("GameLayer2"));
	GameLayerBG = document.getElementById("GameLayerBG");
	if (GameLayerBG.ontouchstart === null) {
		GameLayerBG.ontouchstart = gameTapEvent;
	} else {
		GameLayerBG.onmousedown = gameTapEvent;
	}
	gameInit();
	initSetting();
	window.addEventListener("resize", refreshSize, false);
	const btn = document.getElementById("ready-btn");
	btn.className = "btn btn-primary btn-lg";
	btn.onclick = () => {
		closeWelcomeLayer();
	};

	document.addEventListener("keydown", (e) => {
		if (!isDesktop) return;
		const key = e.key.toLowerCase();

		if (Object.hasOwn(map, key) && isplaying()) {
			click(map[key]);
		} else if (
			key === "r" &&
			document.getElementById("GameScoreLayer").style.display !== "none"
		) {
			gameRestart();
			document.getElementById("GameScoreLayer").style.display = "none";
		}
	});
}

function winOpen() {
	window.open(
		location.href + "?r=" + Math.random(),
		"nWin",
		"height=500,width=320,toolbar=no,menubar=no,scrollbars=no",
	);
	const opened = window.open("about:blank", "_self");
	opened.opener = null;
	opened.close();
}
let refreshSizeTime;

function refreshSize() {
	clearTimeout(refreshSizeTime);
	refreshSizeTime = setTimeout(_refreshSize, 200);
}

function _refreshSize() {
	countBlockSize();
	for (let i = 0; i < GameLayer.length; i++) {
		const box = GameLayer[i];
		for (let j = 0; j < box.children.length; j++) {
			const r = box.children[j],
				rstyle = r.style;
			rstyle.left = (j % __k) * blockSize + "px";
			rstyle.bottom = Math.floor(j / __k) * blockSize + "px";
			rstyle.width = blockSize + "px";
			rstyle.height = blockSize + "px";
		}
	}
	let f, a;
	if (GameLayer[0].y > GameLayer[1].y) {
		f = GameLayer[0];
		a = GameLayer[1];
	} else {
		f = GameLayer[1];
		a = GameLayer[0];
	}
	const y = (_gameBBListIndex % 10) * blockSize;
	f.y = y;
	f.style[transform] = "translate3D(0," + f.y + "px,0)";
	a.y = -blockSize * Math.floor(f.children.length / __k) + y;
	a.style[transform] = "translate3D(0," + a.y + "px,0)";
}

function countBlockSize() {
	blockSize = body.offsetWidth / __k;
	body.style.height = window.innerHeight + "px";
	GameLayerBG.style.height = window.innerHeight + "px";
	touchArea[0] = window.innerHeight - blockSize * 0;
	touchArea[1] = window.innerHeight - blockSize * 3;
}
let _gameBBList = [],
	_gameBBListIndex = 0,
	_gameOver = false,
	_gameStart = false,
	_gameTime,
	_gameTimeNum,
	_gameScore,
	_date1,
	deviation_time;

function gameInit() {
	createjs.Sound.registerSound({
		src: "/audio/err.mp3",
		id: "err",
	});
	createjs.Sound.registerSound({
		src: "/audio/end.mp3",
		id: "end",
	});
	createjs.Sound.registerSound({
		src: "/audio/tap.mp3",
		id: "tap",
	});
	gameRestart();
}

let last = 0,
	lkey = 0;

function gameRestart() {
	last = 0;
	lkey = 0;
	_gameBBList = [];
	_gameBBListIndex = 0;
	_gameScore = 0;
	_gameOver = false;
	_gameStart = false;
	_gameTimeNum = __Time;
	GameTimeLayer.innerHTML = creatTimeText(_gameTimeNum);
	countBlockSize();
	refreshGameLayer(GameLayer[0]);
	refreshGameLayer(GameLayer[1], 1);
}

function gameStart() {
	_date1 = new Date();
	_gameStart = true;
	_gameTimeNum = __Time;
	_gameTime = setInterval(gameTime, 1000);
}

let date2 = new Date();

function gameOver() {
	date2 = new Date();
	_gameOver = true;
	clearInterval(_gameTime);
	setTimeout(() => {
		GameLayerBG.className = "";
		showGameScoreLayer();
	}, 1500);
}

function gameTime() {
	_gameTimeNum--;
	if (_gameTimeNum <= 0) {
		GameTimeLayer.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;时间到！";
		gameOver();
		GameLayerBG.className += " flash";
		if (!_close) {
			createjs.Sound.play("end");
		}
	} else {
		GameTimeLayer.innerHTML = creatTimeText(_gameTimeNum);
	}
}

function creatTimeText(n) {
	return "&nbsp;剩余时间:" + n;
}

const _ttreg = / t{1,2}(\d+)/,
	_clearttClsReg = / t{1,2}\d+| bad/;

function randomPos() {
	//生成按键产生的随机位置
	let x = 0;
	if (key[last] == "!") {
		x = Math.floor(Math.random() * 1000) % __k;
		let pos = last - 1;
		if (pos == -1) {
			pos = len - 1;
		}
	} else if (key[last] == "@") {
		x = Math.floor(Math.random() * 1000) % __k;
		if (x == lkey) {
			x++;
			if (x == __k) {
				x = 0;
			}
		}
	} else if (key[last] == "#") {
		x = lkey;
	} else if (key[last] == "&") {
		x = __k - 1 - lkey;
	} else if (key[last] == "+") {
		const num = parseInt(key[last + 1]);
		last++;
		x = (lkey + num) % __k;
	} else if (key[last] == "-") {
		const num = parseInt(key[last + 1]);
		last++;
		x = (lkey - num + __k) % __k;
	} else if (key[last] == "%") {
		const num1 = parseInt(key[last + 1]) - 1;
		let num2 = parseInt(key[last + 2]) - 1;
		if (num2 < num1) {
			num2 += __k;
		}
		x = randomFrom(num1, num2) % __k;
		last += 2;
	} else if (key[last] == "*") {
		const l = parseInt(key[last + 1]);
		const nums = [];
		for (let i = 1; i <= l; ++i) {
			nums.push(parseInt(key[last + i + 1]) - 1);
		}
		last += l + 1;
		x = nums[randomFrom(0, l - 1)];
	} else {
		x = parseInt(key[last]) - 1;
	}
	lkey = x;
	last++;
	if (last == len) {
		last = 0;
	}
	return x;
}

function refreshGameLayer(box, loop, offset) {
	let i = randomPos() + (loop ? 0 : __k);
	for (let j = 0; j < box.children.length; j++) {
		const r = box.children[j],
			rstyle = r.style;
		rstyle.left = (j % __k) * blockSize + "px";
		rstyle.bottom = Math.floor(j / __k) * blockSize + "px";
		rstyle.width = blockSize + "px";
		rstyle.height = blockSize + "px";
		rstyle.backgroundImage = "none";
		r.className = r.className.replace(_clearttClsReg, "");
		if (i == j) {
			_gameBBList.push({
				cell: i % __k,
				id: r.id,
			});
			rstyle.backgroundImage = "url(" + url + ")";
			rstyle.backgroundSize = "cover";
			r.className +=
				" t" + ((Math.floor(Math.random() * 1000) % (__k + 1)) + 1);
			r.notEmpty = true;
			if (j < box.children.length - __k) {
				i = randomPos() + (Math.floor(j / __k) + 1) * __k;
			}
		} else {
			r.notEmpty = false;
		}
	}
	if (loop) {
		box.style.webkitTransitionDuration = "0ms";
		box.style.display = "none";
		box.y =
			-blockSize *
			(Math.floor(box.children.length / __k) + (offset || 0)) *
			loop;
		setTimeout(() => {
			box.style[transform] = "translate3D(0," + box.y + "px,0)";
			setTimeout(() => {
				box.style.display = "block";
			}, 0);
		}, 0);
	} else {
		box.y = 0;
		box.style[transform] = "translate3D(0," + box.y + "px,0)";
	}
	box.style[transitionDuration] = "180ms";
}

function gameLayerMoveNextRow() {
	for (let i = 0; i < GameLayer.length; i++) {
		const g = GameLayer[i];
		g.y += blockSize;
		if (g.y > blockSize * Math.floor(g.children.length / __k)) {
			refreshGameLayer(g, 1, -1);
		} else {
			g.style[transform] = "translate3D(0," + g.y + "px,0)";
		}
	}
}

function gameTapEvent(e) {
	if (_gameOver) {
		return false;
	}
	let tar = e.target;
	const y = e.clientY || e.targetTouches[0].clientY,
		x = (e.clientX || e.targetTouches[0].clientX) - body.offsetLeft,
		p = _gameBBList[_gameBBListIndex];

	if (!_fsj && (y > touchArea[0] || y < touchArea[1])) {
		return false;
	}
	if (
		((p.id == tar.id || (_fsj && p.id % __k == tar.id % __k)) &&
			tar.notEmpty) ||
		(p.cell == 0 && x < blockSize) ||
		(x > p.cell * blockSize && x < (p.cell + 1) * blockSize) ||
		(p.cell == __k - 1 && x > (__k - 1) * blockSize)
	) {
		if (!_gameStart) {
			gameStart();
		}
		if (!_close) {
			createjs.Sound.play("tap");
		}
		tar = document.getElementById(p.id);
		tar.className = tar.className.replace(_ttreg, " tt$1");
		tar.style.backgroundImage = "none";
		_gameBBListIndex++;
		_gameScore++;
		gameLayerMoveNextRow();
	} else if (_gameStart && !tar.notEmpty) {
		if (!_close) {
			createjs.Sound.play("err");
		}
		gameOver();
		tar.className += " bad";
	}
	return false;
}

function createGameLayer() {
	let html = '<div id="GameLayerBG">';
	for (let i = 1; i <= 2; i++) {
		const id = "GameLayer" + i;
		html += '<div id="' + id + '" class="GameLayer">';
		for (let j = 0; j < (__k * 2 >= 10 ? __k * 2 : __k * 3); j++) {
			for (let k = 0; k < __k; k++) {
				html +=
					'<div id="' +
					id +
					"-" +
					(k + j * __k) +
					'" num="' +
					(k + j * __k) +
					'" class="block' +
					(k ? " bl" : "") +
					'"></div>';
			}
		}
		html += "</div>";
	}
	html += "</div>";
	html += '<div id="GameTimeLayer"></div>';
	return html;
}

function closeWelcomeLayer() {
	const l = document.getElementById("welcome");
	l.style.display = "none";
}

function showWelcomeLayer() {
	const l = document.getElementById("welcome");
	l.style.display = "block";
}

function showGameScoreLayer() {
	const l = document.getElementById("GameScoreLayer");
	const c = document
		.getElementById(_gameBBList[_gameBBListIndex - 1].id)
		.className.match(_ttreg)[1];
	l.className = l.className.replace(/bgc\d/, "bgc" + c);
	document.getElementById("GameScoreLayer-text").innerHTML = hide
		? ""
		: "<span style='color:red;'>" + shareText(_gameScore) + "</span>";
	let score_text = "您坚持了 ";
	score_text +=
		"<span style='color:red;'>" +
		(deviation_time / 1000).toFixed(2) +
		"</span>" +
		" 秒哦！<br>您的得分为 ";
	score_text += "<span style='color:red;'>" + _gameScore + "</span>";
	score_text += "<br>您平均每秒点击了 ";
	score_text +=
		"<span style='color:red;'>" +
		((_gameScore * 1000) / deviation_time).toFixed(2);
	score_text += "</span>" + " 次哦！";
	score_text +=
		"<br>相当于 <span style='color:red;'>" +
		((_gameScore * 15000) / deviation_time).toFixed(2) +
		"</span> BPM 下的十六分音符哦！";
	document.getElementById("GameScoreLayer-score").innerHTML = score_text;
	let bast = cookie("bast-score");

	if (!bast || _gameScore > bast) {
		bast = _gameScore;
		saveData("bast-score", bast);
	}

	document.getElementById("GameScoreLayer-bast").innerHTML =
		"历史最佳得分 " + "<span style='color:red;'>" + bast + "</span>";
	const now =
		"您的自定义键型为：" +
		"<span style='color:red;'>" +
		key.join("") +
		"</span>";
	document.getElementById("now").innerHTML = now;
	l.style.display = "block";
}

function hideGameScoreLayer() {
	const l = document.getElementById("GameScoreLayer");
	l.style.display = "none";
}

function replayBtn() {
	gameRestart();
	hideGameScoreLayer();
}

function backBtn() {
	gameRestart();
	hideGameScoreLayer();
	showWelcomeLayer();
}

function shareText(score) {
	deviation_time = date2.getTime() - _date1.getTime();
	if (score <= 2.5 * __Time) return "加油！我相信您可以的！";
	if (score <= 5 * __Time) return "^_^ 加把劲，底力大王就是您！";
	if (score <= 7.5 * __Time) return "您！";
	if (score <= 10 * __Time) return "太 您 了！";
	return "您是外星人嘛？";
}

function initSetting() {
	const kSetting = loadData("k");
	if (kSetting) {
		const tsmp = parseInt(kSetting);
		if (tsmp != __k) {
			__k = tsmp;
			var el = document.getElementById("GameLayerBG");
			const fa = el.parentNode;
			fa.removeChild(el);
			fa.removeChild(GameTimeLayer);
			fa.appendChild(parseElement(createGameLayer()));
			fa.appendChild(parseElement('<div id = "GameTimeLayer"></div>'));
			GameTimeLayer = document.getElementById("GameTimeLayer");
			GameLayer = [];
			GameLayer.push(document.getElementById("GameLayer1"));
			GameLayer.push(document.getElementById("GameLayer2"));
			GameLayerBG = document.getElementById("GameLayerBG");
			if (GameLayerBG.ontouchstart === null) {
				GameLayerBG.ontouchstart = gameTapEvent;
			} else {
				GameLayerBG.onmousedown = gameTapEvent;
			}
		}
	}

	const timeSetting = loadData("time");
	if (timeSetting) {
		__Time = parseInt(timeSetting, 10);
		GameTimeLayer.innerHTML = creatTimeText(__Time);
	}

	const keySetting = loadData("key");
	if (keySetting) {
		const str = keySetting;
		map = {};
		for (let i = 0; i < __k; ++i) {
			if (str.charAt(i)) map[str.charAt(i).toLowerCase()] = i + 1;
		}
	}

	const noteSetting = loadData("note");
	if (noteSetting) {
		key = noteSetting.split("");
		gl();
	}

	const hideSetting = loadData("hide");
	if (hideSetting === "1" || hideSetting === true) {
		hide = true;
	}

	const fsjSetting = loadData("fsj");
	if (fsjSetting === "1" || fsjSetting === true) {
		_fsj = true;
	}

	const closeSetting = loadData("close");
	if (closeSetting === "1" || closeSetting === true) {
		_close = true;
	}

	gameRestart();
}

function show_btn(i) {
	document.getElementById("tt").style.display = "block";
	document.getElementById("ttt").style.display = "block";
	document.getElementById("btn_group").style.display = "block";
	document.getElementById("btn_group2").style.display = "block";
	document.getElementById("setting" + i.toString()).style.display = "none";
}

function nxtpage(i) {
	document.getElementById("setting" + i.toString()).style.display = "none";
	document.getElementById("setting" + (i + 1).toString()).style.display =
		"block";
}

function lstpage(i) {
	document.getElementById("setting" + i.toString()).style.display = "none";
	document.getElementById("setting" + (i - 1).toString()).style.display =
		"block";
}

function show_setting() {
	var str = [];
	for (var i = 1; i <= __k; ++i) {
		str.push("a");
	}
	for (var ke in map) {
		str[map[ke] - 1] = ke.charAt(0);
	}
	document.getElementById("k").value = __k.toString();
	document.getElementById("keyboard").value = str.join("");
	document.getElementById("timeinput").value = __Time.toString();
	document.getElementById("note").value = key.join("");
	document.getElementById("hide").checked = hide;
	document.getElementById("close").checked = _close;
	document.getElementById("fsj").checked = _fsj;
	document.getElementById("btn_group").style.display = "none";
	document.getElementById("btn_group2").style.display = "none";
	document.getElementById("tt").style.display = "none";
	document.getElementById("ttt").style.display = "none";
	document.getElementById("setting1").style.display = "block";
}

function save_cookie() {
	const str = document.getElementById("keyboard").value;
	const Time = document.getElementById("timeinput").value;
	const note = document.getElementById("note").value;
	hide = document.getElementById("hide").checked;
	_close = document.getElementById("close").checked;
	_fsj = document.getElementById("fsj").checked;

	const tsmp = parseInt(document.getElementById("k").value);
	if (tsmp != __k) {
		__k = tsmp;
		var el = document.getElementById("GameLayerBG");
		const fa = el.parentNode;
		fa.removeChild(el);
		fa.removeChild(GameTimeLayer);
		fa.appendChild(parseElement(createGameLayer()));
		fa.appendChild(parseElement('<div id = "GameTimeLayer"></div>'));
		GameTimeLayer = document.getElementById("GameTimeLayer");
		GameLayer = [];
		GameLayer.push(document.getElementById("GameLayer1"));
		GameLayer.push(document.getElementById("GameLayer2"));
		GameLayerBG = document.getElementById("GameLayerBG");
		if (GameLayerBG.ontouchstart === null) {
			GameLayerBG.ontouchstart = gameTapEvent;
		} else {
			GameLayerBG.onmousedown = gameTapEvent;
		}
	}

	map = {};
	for (let i = 0; i < __k; ++i) {
		map[str.charAt(i).toLowerCase()] = i + 1;
	}

	__Time = parseInt(Time);
	GameTimeLayer.innerHTML = creatTimeText(__Time);

	key = note.split("");
	gl();

	saveData("k", __k);
	saveData("note", key.join(""));
	saveData("time", Time);
	saveData("key", str);
	saveData("close", _close ? "1" : "0");
	saveData("hide", hide ? "1" : "0");
	saveData("fsj", _fsj ? "1" : "0");

	gameRestart();
}

function click(index) {
	const p = _gameBBList[_gameBBListIndex];
	const base =
		parseInt(document.getElementById(p.id).getAttribute("num")) - p.cell;
	const num = base + index - 1;
	const id = p.id.substring(0, 11) + num;

	const fakeEvent = {
		clientX:
			((index - 1) * blockSize + index * blockSize) / 2 + body.offsetLeft,
		// Make sure that it is in the area
		clientY: (touchArea[0] + touchArea[1]) / 2,
		target: document.getElementById(id),
	};

	gameTapEvent(fakeEvent);
}

function autoset(asss) {
	key = asss.split("");
	len = key.length;
	gameRestart();
}

function showImg(input) {
	var file = input.files[0];
	url = window.URL.createObjectURL(file);
}

function stair() {
	key = [];
	for (var i = 1; i < __k; ++i) {
		key.push(i.toString());
	}
	for (var i = __k; i > 1; --i) {
		key.push(i.toString());
	}
	len = (__k - 1) * 2;
	gameRestart();
}

window.init = init;
window.gameRestart = gameRestart;
window.replayBtn = replayBtn;
window.backBtn = backBtn;
window.show_setting = show_setting;
window.save_cookie = save_cookie;
window.show_btn = show_btn;
window.nxtpage = nxtpage;
window.lstpage = lstpage;
window.hideGameScoreLayer = hideGameScoreLayer;
window.showWelcomeLayer = showWelcomeLayer;
window.showImg = showImg;
window.autoset = autoset;
window.stair = stair;
window.clearAllData = clearAllData;

init();
