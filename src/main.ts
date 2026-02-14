/** biome-ignore-all lint/style/noNonNullAssertion: 待重构 */
/** biome-ignore-all lint/suspicious/noExplicitAny: 待重构 */
import "./style.css";
import { ConfigManager } from "./logic/ConfigManager";
import { parsePattern } from "./logic/PatternParser";
import { parseElement, randomFrom } from "./utils/common";
import { clearAllData, loadData, saveData } from "./utils/storage";

interface GameBlockElement extends HTMLElement {
	notEmpty?: boolean;
}

interface GameLayerElement extends HTMLElement {
	y: number;
	children: HTMLCollectionOf<GameBlockElement>;
}

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

	cssText += "#GameTimeLayer, #GameLayerBG { position: absolute; }";

	cssText +=
		"#welcome, #GameScoreLayer { position: fixed; left: 0; top: 0; right: 0; bottom: 0; }";

	if (!isDesktop) {
		cssText +=
			"@media screen and (orientation:landscape) {#landscape {display: flex;}}";
	}

	style.innerHTML = cssText;
	document.head.appendChild(style);
}

let map: Record<string, number> = { d: 1, f: 2, j: 3, k: 4 };
let key: string[] = ["!"];
let len = key.length;
let hide = false;
let __Time = 20;
let __k = 4;
let _close = false;
let _fsj = false;
let url = "/image/ClickBefore.png";

function updateGamePattern() {
	const config = ConfigManager.getInstance();
	const patternStr = config.get("dropPattern");
	const laneCount = config.get("laneCount");
	key = parsePattern(patternStr, laneCount);

	len = key.length;
}

function generateKeyMap() {
	const config = ConfigManager.getInstance();
	const mapping = config.get("keyMapping");
	const laneCount = config.get("laneCount");

	map = {};

	for (let i = 0; i < laneCount; ++i) {
		if (mapping[i]) {
			map[mapping[i]!.toLowerCase()] = i + 1;
		}
	}
}

let body: HTMLElement,
	blockSize: number,
	GameLayer: GameLayerElement[] = [],
	GameLayerBG: HTMLElement,
	touchArea: number[] = [],
	GameTimeLayer: HTMLElement;
let transform: string, transitionDuration: string;

function handleBackToHome() {
	hideGameScoreLayer();
	showWelcomeLayer();
	gameRestart();
}

function init() {
	initStyle();

	var container = document.getElementById("gameBody") || document.body;
	if (!document.getElementById("GameLayerBG")) {
		container.insertAdjacentHTML("beforeend", createGameLayer());
	}
	showWelcomeLayer();
	body = document.getElementById("gameBody") || document.body;
	body.style.height = `${window.innerHeight}px`;
	transform =
		typeof body.style.webkitTransform !== "undefined"
			? "webkitTransform"
			: typeof (body.style as any).msTransform !== "undefined"
				? "msTransform"
				: "transform";
	transitionDuration = transform.replace(/ransform/g, "ransitionDuration");
	GameTimeLayer = document.getElementById("GameTimeLayer") as HTMLElement;
	GameLayer.push(document.getElementById("GameLayer1") as GameLayerElement);
	GameLayer.push(document.getElementById("GameLayer2") as GameLayerElement);
	GameLayerBG = document.getElementById("GameLayerBG") as HTMLElement;
	if (GameLayerBG.ontouchstart === null) {
		GameLayerBG.ontouchstart = gameTapEvent;
	} else {
		GameLayerBG.onmousedown = gameTapEvent;
	}
	gameInit();
	initSetting();
	window.addEventListener("resize", refreshSize, false);
	const btn = document.getElementById("ready-btn")!;
	btn.className = "btn btn-primary btn-lg";
	btn.onclick = () => {
		closeWelcomeLayer();
	};

	document.addEventListener("keydown", (e) => {
		if (!isDesktop) return;
		const key = e.key.toLowerCase();

		if (
			GameLayerBG &&
			(document.getElementById("GameScoreLayer") as HTMLElement).style
				.display !== "none"
		) {
			hideGameScoreLayer();
		} else if (map[key] !== undefined) {
			click(map[key]);
		}
	});

	document.addEventListener("contextmenu", (e) => e.preventDefault());

	document.getElementById("btn-replay")?.addEventListener("click", replayBtn);
	document
		.getElementById("btn-back-home")
		?.addEventListener("click", handleBackToHome);

	document.getElementById("btn-link-new")?.addEventListener("click", () => {
		window.location.href = "https://github.com/UlyssesZha/eatcat";
	});
	document.getElementById("btn-link-old")?.addEventListener("click", () => {
		window.location.href = "https://github.com/arcxingye/EatKano";
	});
	document.getElementById("btn-link-author")?.addEventListener("click", () => {
		window.location.href = "https://space.bilibili.com/470549205";
	});

	document
		.getElementById("btn-show-setting")
		?.addEventListener("click", show_setting);
	document
		.getElementById("btn-clear-data")
		?.addEventListener("click", clearAllData);

	document.getElementById("btn-save-p1")?.addEventListener("click", () => {
		show_btn(1);
		save_cookie();
	});
	document.getElementById("btn-next-p1")?.addEventListener("click", () => {
		nxtpage(1);
	});

	document.getElementById("btn-prev-p2")?.addEventListener("click", () => {
		lstpage(2);
	});
	document.getElementById("btn-save-p2")?.addEventListener("click", () => {
		show_btn(2);
		save_cookie();
	});

	document.getElementById("img-btn")?.addEventListener("change", (e) => {
		showImg(e.target as HTMLInputElement);
	});

	const autosetBtns = document.querySelectorAll(".js-autoset");
	autosetBtns.forEach((btn) => {
		btn.addEventListener("click", (e) => {
			const pattern = (e.target as HTMLElement).getAttribute("data-pattern");
			if (pattern) {
				autoset(pattern);
			}
		});
	});

	document.getElementById("btn-stair")?.addEventListener("click", stair);
}

let refreshSizeTime: Timer;

function refreshSize() {
	clearTimeout(refreshSizeTime);
	refreshSizeTime = setTimeout(_refreshSize, 200);
}

function _refreshSize() {
	countBlockSize();
	for (let i = 0; i < GameLayer.length; i++) {
		const box = GameLayer[i]!;
		for (let j = 0; j < box.children.length; j++) {
			const r = box.children[j] as HTMLElement,
				rstyle = r.style;
			rstyle.left = `${(j % __k) * blockSize}px`;
			rstyle.bottom = `${Math.floor(j / __k) * blockSize}px`;
			rstyle.width = `${blockSize}px`;
			rstyle.height = `${blockSize}px`;
		}
	}
	let f: GameLayerElement, a: GameLayerElement;
	if (GameLayer[0]!.y > GameLayer[1]!.y) {
		f = GameLayer[0]!;
		a = GameLayer[1]!;
	} else {
		f = GameLayer[1]!;
		a = GameLayer[0]!;
	}
	const y = (_gameBBListIndex % 10) * blockSize;
	f.y = y;
	f.style[transform as any] = `translate3D(0,${f.y}px,0)`;
	a.y = -blockSize * Math.floor(f.children.length / __k) + y;
	a.style[transform as any] = `translate3D(0,${a.y}px,0)`;
}

function countBlockSize() {
	blockSize = body.offsetWidth / __k;
	body.style.height = `${window.innerHeight}px`;
	GameLayerBG.style.height = `${window.innerHeight}px`;
	touchArea[0] = window.innerHeight - blockSize * 0;
	touchArea[1] = window.innerHeight - blockSize * 3;
}
let _gameBBList: { cell: number; id: string }[] = [],
	_gameBBListIndex = 0,
	_gameOver = false,
	_gameStart = false,
	_gameTime: any,
	_gameTimeNum: number,
	_gameScore: number,
	_date1: Date,
	deviation_time: number;

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
	refreshGameLayer(GameLayer[0]!);
	refreshGameLayer(GameLayer[1]!, 1);
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

function creatTimeText(n: number) {
	return `&nbsp;剩余时间:${n}`;
}

const _ttreg = / t{1,2}(\d+)/,
	_clearttClsReg = / t{1,2}\d+| bad/;

function randomPos() {
	//生成按键产生的随机位置
	let x = 0;
	if (key[last] === "!") {
		x = Math.floor(Math.random() * 1000) % __k;
		let pos = last - 1;
		if (pos === -1) {
			pos = len - 1;
		}
	} else if (key[last] === "@") {
		x = Math.floor(Math.random() * 1000) % __k;
		if (x === lkey) {
			x++;
			if (x === __k) {
				x = 0;
			}
		}
	} else if (key[last] === "#") {
		x = lkey;
	} else if (key[last] === "&") {
		x = __k - 1 - lkey;
	} else if (key[last] === "+") {
		const num = parseInt(key[last + 1]!, 10);
		last++;
		x = (lkey + num) % __k;
	} else if (key[last] === "-") {
		const num = parseInt(key[last + 1]!, 10);
		last++;
		x = (lkey - num + __k) % __k;
	} else if (key[last] === "%") {
		const num1 = parseInt(key[last + 1]!, 10) - 1;
		let num2 = parseInt(key[last + 2]!, 10) - 1;
		if (num2 < num1) {
			num2 += __k;
		}
		x = randomFrom(num1, num2) % __k;
		last += 2;
	} else if (key[last] === "*") {
		const l = parseInt(key[last + 1]!, 10);
		const nums = [];
		for (let i = 1; i <= l; ++i) {
			nums.push(parseInt(key[last + i + 1]!, 10) - 1);
		}
		last += l + 1;
		x = nums[randomFrom(0, l - 1)]!;
	} else {
		x = parseInt(key[last]!, 10) - 1;
	}
	lkey = x;
	last++;
	if (last === len) {
		last = 0;
	}
	return x;
}

function refreshGameLayer(
	box: GameLayerElement,
	loop?: number | boolean,
	offset?: number,
) {
	let i = randomPos() + (loop ? 0 : __k);
	for (let j = 0; j < box.children.length; j++) {
		const r = box.children[j] as GameBlockElement,
			rstyle = r.style;
		rstyle.left = `${(j % __k) * blockSize}px`;
		rstyle.bottom = `${Math.floor(j / __k) * blockSize}px`;
		rstyle.width = `${blockSize}px`;
		rstyle.height = `${blockSize}px`;
		rstyle.backgroundImage = "none";
		r.className = r.className.replace(_clearttClsReg, "");
		if (i === j) {
			_gameBBList.push({
				cell: i % __k,
				id: r.id,
			});
			rstyle.backgroundImage = `url(${url})`;
			rstyle.backgroundSize = "cover";
			r.className += ` t${(Math.floor(Math.random() * 1000) % (__k + 1)) + 1}`;
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
			Number(loop);
		setTimeout(() => {
			box.style[transform as any] = `translate3D(0,${box.y}px,0)`;
			setTimeout(() => {
				box.style.display = "block";
			}, 0);
		}, 0);
	} else {
		box.y = 0;
		box.style[transform as any] = `translate3D(0,${box.y}px,0)`;
	}
	box.style[transitionDuration as any] = "180ms";
}

function gameLayerMoveNextRow() {
	for (let i = 0; i < GameLayer.length; i++) {
		const g = GameLayer[i]!;
		g.y += blockSize;
		if (g.y > blockSize * Math.floor(g.children.length / __k)) {
			refreshGameLayer(g, 1, -1);
		} else {
			g.style[transform as any] = `translate3D(0,${g.y}px,0)`;
		}
	}
}

function getEventPosition(e: MouseEvent | TouchEvent, container: HTMLElement) {
	let clientX: number, clientY: number;

	if ("touches" in e && e.touches && e.touches.length > 0) {
		clientX = e.touches[0]!.clientX;
		clientY = e.touches[0]!.clientY;
	} else {
		clientX = (e as MouseEvent).clientX;
		clientY = (e as MouseEvent).clientY;
	}

	const rect = container.getBoundingClientRect();
	return {
		x: clientX - rect.left,
		y: clientY - rect.top,
	};
}

function gameTapEvent(e: MouseEvent | TouchEvent) {
	if (_gameOver) {
		return false;
	}

	const container = document.getElementById("gameBody") || document.body;
	const { x, y } = getEventPosition(e, container);

	const currentTarget = _gameBBList[_gameBBListIndex];

	if (!currentTarget) return false;

	const clickedLane = Math.floor(x / blockSize);

	const isYValid = _fsj || (y <= touchArea[0]! && y >= touchArea[1]!);

	if (!isYValid) {
		return false;
	}

	const isLaneCorrect = clickedLane === currentTarget.cell;

	if (isLaneCorrect) {
		if (!_gameStart) {
			gameStart();
		}

		if (!_close) {
			createjs.Sound.play("tap");
		}

		const targetNode = document.getElementById(currentTarget.id);
		if (targetNode) {
			targetNode.className = targetNode.className.replace(/ t\d+/, " tt1");
			targetNode.style.backgroundImage = "none";
		}

		_gameBBListIndex++;
		_gameScore++;

		gameLayerMoveNextRow();
	} else {
		if (_gameStart) {
			if (!_close) {
				createjs.Sound.play("err");
			}

			if ((e.target as HTMLElement)?.classList.contains("block")) {
				(e.target as HTMLElement).classList.add("bad");
			}

			gameOver();
		}
	}

	if (e.preventDefault) e.preventDefault();
	return false;
}

function createGameLayer() {
	let html = '<div id="GameLayerBG">';
	for (let i = 1; i <= 2; i++) {
		const id = `GameLayer${i}`;
		html += `<div id="${id}" class="GameLayer">`;
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
	const l = document.getElementById("welcome")!;
	l.style.display = "none";
}

function showWelcomeLayer() {
	const l = document.getElementById("welcome")!;
	l.style.display = "block";
}

function showGameScoreLayer() {
	const l = document.getElementById("GameScoreLayer")!;
	const c = (
		document.getElementById(
			_gameBBList[_gameBBListIndex - 1]!.id,
		) as HTMLElement
	).className.match(_ttreg)![1];
	l.className = l.className.replace(/bgc\d/, `bgc${c}`);
	document.getElementById("GameScoreLayer-text")!.innerHTML = hide
		? ""
		: `<span style='color:red;'>${shareText(_gameScore)}</span>`;
	let score_text = "您坚持了 ";
	score_text +=
		"<span style='color:red;'>" +
		(deviation_time / 1000).toFixed(2) +
		"</span>" +
		" 秒哦！<br>您的得分为 ";
	score_text += `<span style='color:red;'>${_gameScore}</span>`;
	score_text += "<br>您平均每秒点击了 ";
	score_text +=
		"<span style='color:red;'>" +
		((_gameScore * 1000) / deviation_time).toFixed(2);
	score_text += "</span>" + " 次哦！";
	score_text +=
		"<br>相当于 <span style='color:red;'>" +
		((_gameScore * 15000) / deviation_time).toFixed(2) +
		"</span> BPM 下的十六分音符哦！";
	document.getElementById("GameScoreLayer-score")!.innerHTML = score_text;
	let bast = loadData<number>("bast-score");

	if (!bast || _gameScore > bast) {
		bast = _gameScore;
		saveData("bast-score", bast);
	}

	document.getElementById("GameScoreLayer-bast")!.innerHTML =
		`历史最佳得分 <span style='color:red;'>${bast}</span>`;
	const now =
		"您的自定义键型为：" +
		"<span style='color:red;'>" +
		key.join("") +
		"</span>";
	document.getElementById("now")!.innerHTML = now;
	l.classList.add("visible");
}

function hideGameScoreLayer() {
	const l = document.getElementById("GameScoreLayer")!;
	l.classList.remove("visible");
}

function replayBtn() {
	gameRestart();
	hideGameScoreLayer();
}

function shareText(score: number) {
	deviation_time = date2.getTime() - _date1.getTime();
	if (score <= 2.5 * __Time) return "加油！我相信您可以的！";
	if (score <= 5 * __Time) return "^_^ 加把劲，底力大王就是您！";
	if (score <= 7.5 * __Time) return "您！";
	if (score <= 10 * __Time) return "太 您 了！";
	return "您是外星人嘛？";
}

function initSetting() {
	const config = ConfigManager.getInstance();

	const laneCount = config.get("laneCount");
	(document.getElementById("k") as HTMLInputElement).value =
		laneCount.toString();

	(document.getElementById("keyboard") as HTMLInputElement).value = config
		.get("keyMapping")
		.join("");

	(document.getElementById("timeinput") as HTMLInputElement).value = config
		.get("timeLimit")
		.toString();
	(document.getElementById("note") as HTMLInputElement).value =
		config.get("dropPattern");

	(document.getElementById("hide") as HTMLInputElement).checked =
		config.get("hideEndText");
	(document.getElementById("close") as HTMLInputElement).checked =
		config.get("isSoundMuted");
	(document.getElementById("fsj") as HTMLInputElement).checked = config.get(
		"enableVerticalJudgement",
	);

	generateKeyMap();
	updateGamePattern();
	gameRestart();
}

function show_btn(i: number) {
	document.getElementById("tt")!.style.display = "block";
	document.getElementById("ttt")!.style.display = "block";
	document.getElementById("btn_group")!.style.display = "block";
	document.getElementById("btn_group2")!.style.display = "block";
	document.getElementById(`setting${i.toString()}`)!.style.display = "none";
}

function nxtpage(i: number) {
	document.getElementById(`setting${i.toString()}`)!.style.display = "none";
	document.getElementById(`setting${(i + 1).toString()}`)!.style.display =
		"block";
}

function lstpage(i: number) {
	document.getElementById(`setting${i.toString()}`)!.style.display = "none";
	document.getElementById(`setting${(i - 1).toString()}`)!.style.display =
		"block";
}

function show_setting() {
	const str = [];
	for (let i = 1; i <= __k; ++i) {
		str.push("a");
	}
	for (const ke in map) {
		str[map[ke]! - 1] = ke.charAt(0);
	}
	(document.getElementById("k") as HTMLInputElement).value = __k.toString();
	(document.getElementById("keyboard") as HTMLInputElement).value =
		str.join("");
	(document.getElementById("timeinput") as HTMLInputElement).value =
		__Time.toString();
	(document.getElementById("note") as HTMLInputElement).value = key.join("");
	(document.getElementById("hide") as HTMLInputElement).checked = hide;
	(document.getElementById("close") as HTMLInputElement).checked = _close;
	(document.getElementById("fsj") as HTMLInputElement).checked = _fsj;
	document.getElementById("btn_group")!.style.display = "none";
	document.getElementById("btn_group2")!.style.display = "none";
	document.getElementById("tt")!.style.display = "none";
	document.getElementById("ttt")!.style.display = "none";
	document.getElementById("setting1")!.style.display = "block";
}

function save_cookie() {
	const str = (document.getElementById("keyboard") as HTMLInputElement).value;
	const Time = (document.getElementById("timeinput") as HTMLInputElement).value;
	hide = (document.getElementById("hide") as HTMLInputElement).checked;
	_close = (document.getElementById("close") as HTMLInputElement).checked;
	_fsj = (document.getElementById("fsj") as HTMLInputElement).checked;

	const tsmp = parseInt(
		(document.getElementById("k") as HTMLInputElement).value,
		10,
	);
	if (tsmp !== __k) {
		__k = tsmp;
		const el = document.getElementById("GameLayerBG")!;
		const fa = el.parentNode!;
		fa.removeChild(el);
		fa.removeChild(GameTimeLayer);
		fa.appendChild(parseElement(createGameLayer()));
		fa.appendChild(parseElement('<div id = "GameTimeLayer"></div>'));
		GameTimeLayer = document.getElementById("GameTimeLayer") as HTMLElement;
		GameLayer = [];
		GameLayer.push(document.getElementById("GameLayer1") as GameLayerElement);
		GameLayer.push(document.getElementById("GameLayer2") as GameLayerElement);
		GameLayerBG = document.getElementById("GameLayerBG") as HTMLElement;
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

	__Time = parseInt(Time, 10);
	GameTimeLayer.innerHTML = creatTimeText(__Time);

	updateGamePattern();

	saveData("k", __k);
	saveData("note", key.join(""));
	saveData("time", Time);
	saveData("key", str);
	saveData("close", _close ? "1" : "0");
	saveData("hide", hide ? "1" : "0");
	saveData("fsj", _fsj ? "1" : "0");

	gameRestart();
}

function click(laneIndex: number) {
	const lane = laneIndex - 1;
	const centerX = lane * blockSize + blockSize / 2;
	const centerY = (touchArea[0]! + touchArea[1]!) / 2;

	const mockEvent = {
		clientX:
			centerX +
			document.getElementById("gameBody")!.getBoundingClientRect().left,
		clientY:
			centerY +
			document.getElementById("gameBody")!.getBoundingClientRect().top,
		preventDefault: () => {},
		target: null,
		touches: [],
	};

	gameTapEvent(mockEvent as unknown as TouchEvent);
}

function autoset(pattern: string) {
	ConfigManager.getInstance().update({
		dropPattern: pattern,
	});

	updateGamePattern();

	gameRestart();
}

function showImg(input: HTMLInputElement) {
	var file = input.files![0];
	url = window.URL.createObjectURL(file!);
}

function stair() {
	const k = ConfigManager.getInstance().get("laneCount");
	let pattern = "";

	for (let i = 1; i < k; ++i) {
		pattern += i.toString();
	}
	for (let i = k; i > 1; --i) {
		pattern += i.toString();
	}

	ConfigManager.getInstance().update({
		dropPattern: pattern,
	});
	updateGamePattern();

	gameRestart();
}

init();
