/** biome-ignore-all lint/style/noNonNullAssertion: 待重构 */
/** biome-ignore-all lint/suspicious/noExplicitAny: 待重构 */
import "./style.css";
import { ConfigManager } from "./logic/ConfigManager";
import { GameState, GameStatus } from "./logic/GameState";
import { parsePattern } from "./logic/PatternParser";
import { parseElement, randomFrom } from "./utils/common";
import { clearAllData } from "./utils/storage";

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
const config = ConfigManager.getInstance();

function updateGamePattern() {
	const patternStr = config.get("dropPattern");
	const laneCount = config.get("laneCount");
	key = parsePattern(patternStr, laneCount);

	len = key.length;
}

function generateKeyMap() {
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

let _gameTime: ReturnType<typeof setInterval>;
let refreshSizeTime: Timer;

const gameState = new GameState();

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

		if (key === "r") {
			gameRestart();
			hideGameScoreLayer();
			return;
		}

		const scoreLayer = document.getElementById("GameScoreLayer") as HTMLElement;
		const isScoreLayerVisible = scoreLayer.classList.contains("visible");

		if (GameLayerBG && isScoreLayerVisible) {
			// hideGameScoreLayer();
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

	document.getElementById("upload-input")?.addEventListener("change", (e) => {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			showImg(target);
		}
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

function refreshSize() {
	clearTimeout(refreshSizeTime);
	refreshSizeTime = setTimeout(_refreshSize, 200);
}

function _refreshSize() {
	const laneCount = config.get("laneCount");

	countBlockSize();
	for (let i = 0; i < GameLayer.length; i++) {
		const box = GameLayer[i]!;
		for (let j = 0; j < box.children.length; j++) {
			const r = box.children[j] as HTMLElement,
				rstyle = r.style;
			rstyle.left = `${(j % laneCount) * blockSize}px`;
			rstyle.bottom = `${Math.floor(j / laneCount) * blockSize}px`;
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
	const y = (gameState.currentBlockIndex % 10) * blockSize;
	f.y = y;
	f.style[transform as any] = `translate3D(0,${f.y}px,0)`;
	a.y = -blockSize * Math.floor(f.children.length / laneCount) + y;
	a.style[transform as any] = `translate3D(0,${a.y}px,0)`;
}

function countBlockSize() {
	const laneCount = config.get("laneCount");

	blockSize = body.offsetWidth / laneCount;
	body.style.height = `${window.innerHeight}px`;
	GameLayerBG.style.height = `${window.innerHeight}px`;
	touchArea[0] = window.innerHeight - blockSize * 0;
	touchArea[1] = window.innerHeight - blockSize * 3;
}

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

function gameRestart() {
	gameState.init(config.get("timeLimit"));

	GameTimeLayer.innerHTML = creatTimeText(gameState.remainingTime);

	countBlockSize();
	refreshGameLayer(GameLayer[0]!);
	refreshGameLayer(GameLayer[1]!, 1);
}

function gameStart() {
	gameState.startGame();

	_gameTime = setInterval(gameTime, 1000);
}

function gameOver() {
	gameState.finishGame();

	clearInterval(_gameTime);
	setTimeout(() => {
		GameLayerBG.className = "";
		showGameScoreLayer();
	}, 1500);
}

function gameTime() {
	const isTimeUp = gameState.tickTimer();

	if (isTimeUp) {
		GameTimeLayer.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;时间到！";
		gameOver();
		GameLayerBG.className += " flash";
		if (!config.get("isSoundMuted")) {
			createjs.Sound.play("end");
		}
	} else {
		GameTimeLayer.innerHTML = creatTimeText(gameState.remainingTime);
	}
}

function creatTimeText(n: number) {
	return `&nbsp;剩余时间:${n}`;
}

const _ttreg = / t{1,2}(\d+)/,
	_clearttClsReg = / t{1,2}\d+| bad/;

function randomPos() {
	const laneCount = config.get("laneCount");

	// 生成按键产生的随机位置
	let x = 0;
	if (key[gameState.patternCursor] === "!") {
		x = Math.floor(Math.random() * 1000) % laneCount;
		let pos = gameState.patternCursor - 1;
		if (pos === -1) {
			pos = len - 1;
		}
	} else if (key[gameState.patternCursor] === "@") {
		x = Math.floor(Math.random() * 1000) % laneCount;
		if (x === gameState.lastLaneIndex) {
			x++;
			if (x === laneCount) {
				x = 0;
			}
		}
	} else if (key[gameState.patternCursor] === "#") {
		x = gameState.lastLaneIndex;
	} else if (key[gameState.patternCursor] === "&") {
		x = laneCount - 1 - gameState.lastLaneIndex;
	} else if (key[gameState.patternCursor] === "+") {
		const num = parseInt(key[gameState.patternCursor + 1]!, 10);
		gameState.patternCursor++;
		x = (gameState.lastLaneIndex + num) % laneCount;
	} else if (key[gameState.patternCursor] === "-") {
		const num = parseInt(key[gameState.patternCursor + 1]!, 10);
		gameState.patternCursor++;
		x = (gameState.lastLaneIndex - num + laneCount) % laneCount;
	} else if (key[gameState.patternCursor] === "%") {
		const num1 = parseInt(key[gameState.patternCursor + 1]!, 10) - 1;
		let num2 = parseInt(key[gameState.patternCursor + 2]!, 10) - 1;
		if (num2 < num1) {
			num2 += laneCount;
		}
		x = randomFrom(num1, num2) % laneCount;
		gameState.patternCursor += 2;
	} else if (key[gameState.patternCursor] === "*") {
		const l = parseInt(key[gameState.patternCursor + 1]!, 10);
		const nums = [];
		for (let i = 1; i <= l; ++i) {
			nums.push(parseInt(key[gameState.patternCursor + i + 1]!, 10) - 1);
		}
		gameState.patternCursor += l + 1;
		x = nums[randomFrom(0, l - 1)]!;
	} else {
		x = parseInt(key[gameState.patternCursor]!, 10) - 1;
	}

	gameState.lastLaneIndex = x;
	gameState.patternCursor++;
	if (gameState.patternCursor === len) {
		gameState.patternCursor = 0;
	}
	return x;
}

function refreshGameLayer(
	box: GameLayerElement,
	loop?: number | boolean,
	offset?: number,
) {
	const laneCount = config.get("laneCount");
	const skinUrl = config.get("skinUrl");
	let i = randomPos() + (loop ? 0 : laneCount);

	for (let j = 0; j < box.children.length; j++) {
		const r = box.children[j] as GameBlockElement,
			rstyle = r.style;
		rstyle.left = `${(j % laneCount) * blockSize}px`;
		rstyle.bottom = `${Math.floor(j / laneCount) * blockSize}px`;
		rstyle.width = `${blockSize}px`;
		rstyle.height = `${blockSize}px`;
		rstyle.backgroundImage = "none";
		r.className = r.className.replace(_clearttClsReg, "");
		if (i === j) {
			gameState.blockQueue.push({
				cell: i % laneCount,
				id: r.id,
			});
			rstyle.backgroundImage = `url(${skinUrl})`;
			rstyle.backgroundSize = "cover";
			r.className += ` t${(Math.floor(Math.random() * 1000) % (laneCount + 1)) + 1}`;
			r.notEmpty = true;
			if (j < box.children.length - laneCount) {
				i = randomPos() + (Math.floor(j / laneCount) + 1) * laneCount;
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
			(Math.floor(box.children.length / laneCount) + (offset || 0)) *
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
	const laneCount = config.get("laneCount");

	for (let i = 0; i < GameLayer.length; i++) {
		const g = GameLayer[i]!;
		g.y += blockSize;
		if (g.y > blockSize * Math.floor(g.children.length / laneCount)) {
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
	if (gameState.status === GameStatus.ENDED) {
		return false;
	}

	const container = document.getElementById("gameBody") || document.body;
	const { x, y } = getEventPosition(e, container);

	const currentTarget = gameState.blockQueue[gameState.currentBlockIndex];

	if (!currentTarget) return false;

	const clickedLane = Math.floor(x / blockSize);

	const isYValid =
		config.get("enableVerticalJudgement") ||
		(y <= touchArea[0]! && y >= touchArea[1]!);

	if (!isYValid) {
		return false;
	}

	const isLaneCorrect = clickedLane === currentTarget.cell;

	if (isLaneCorrect) {
		if (gameState.status !== GameStatus.PLAYING) {
			gameStart();
		}

		if (!config.get("isSoundMuted")) {
			createjs.Sound.play("tap");
		}

		const targetNode = document.getElementById(currentTarget.id);
		if (targetNode) {
			targetNode.className = targetNode.className.replace(/ t\d+/, " tt1");
			targetNode.style.backgroundImage = "none";
		}

		gameState.currentBlockIndex++;
		gameState.addScore();

		gameLayerMoveNextRow();
	} else {
		if (gameState.status === GameStatus.PLAYING) {
			if (!config.get("isSoundMuted")) {
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
	const laneCount = config.get("laneCount");

	let html = '<div id="GameLayerBG">';
	for (let i = 1; i <= 2; i++) {
		const id = `GameLayer${i}`;
		html += `<div id="${id}" class="GameLayer">`;
		for (
			let j = 0;
			j < (laneCount * 2 >= 10 ? laneCount * 2 : laneCount * 3);
			j++
		) {
			for (let k = 0; k < laneCount; k++) {
				html +=
					'<div id="' +
					id +
					"-" +
					(k + j * laneCount) +
					'" num="' +
					(k + j * laneCount) +
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
	const lastBlockId = gameState.blockQueue[gameState.currentBlockIndex - 1]?.id;
	if (lastBlockId) {
		const lastBlock = document.getElementById(lastBlockId);
		if (lastBlock) {
			const match = lastBlock.className.match(_ttreg);
			if (match) {
				l.className = l.className.replace(/bgc\d/, `bgc${match[1]}`);
			}
		}
	}

	const hideText = config.get("hideEndText");

	document.getElementById("GameScoreLayer-text")!.innerHTML = hideText
		? ""
		: `<span style='color:red;'>${shareText(gameState.score)}</span>`;

	let score_text = "您坚持了 ";
	score_text += `<span style='color:red;'>${(gameState.duration / 1000).toFixed(2)}</span> 秒哦！<br>您的得分为 `;
	score_text += `<span style='color:red;'>${gameState.score}</span>`;
	score_text += "<br>您平均每秒点击了 ";
	score_text += `<span style='color:red;'>${gameState.clicksPerSecond.toFixed(2)}</span> 次哦！`;
	score_text += `<br>相当于 <span style='color:red;'>${gameState.bpmEquivalent.toFixed(2)}</span> BPM 下的十六分音符哦！`;
	document.getElementById("GameScoreLayer-score")!.innerHTML = score_text;
	document.getElementById("GameScoreLayer-bast")!.innerHTML =
		`历史最佳得分 <span style='color:red;'>${gameState.bestScore}</span>`;
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
	const timeLimit = config.get("timeLimit");

	if (score <= 2.5 * timeLimit) return "加油！我相信您可以的！";
	if (score <= 5 * timeLimit) return "^_^ 加把劲，底力大王就是您！";
	if (score <= 7.5 * timeLimit) return "您！";
	if (score <= 10 * timeLimit) return "太 您 了！";
	return "您是外星人嘛？";
}

function initSetting() {
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
	const laneCount = config.get("laneCount");
	const keyMappingStr = config.get("keyMapping").slice(0, laneCount).join("");

	(document.getElementById("k") as HTMLInputElement).value =
		laneCount.toString();
	(document.getElementById("keyboard") as HTMLInputElement).value =
		keyMappingStr;

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

	document.getElementById("btn_group")!.style.display = "none";
	document.getElementById("btn_group2")!.style.display = "none";
	document.getElementById("tt")!.style.display = "none";
	document.getElementById("ttt")!.style.display = "none";
	document.getElementById("setting1")!.style.display = "block";
}

function save_cookie() {
	const keyMappingStr = (
		document.getElementById("keyboard") as HTMLInputElement
	).value;
	const timeStr = (document.getElementById("timeinput") as HTMLInputElement)
		.value;
	const hideEndText = (document.getElementById("hide") as HTMLInputElement)
		.checked;
	const isSoundMuted = (document.getElementById("close") as HTMLInputElement)
		.checked;
	const enableVerticalJudgement = (
		document.getElementById("fsj") as HTMLInputElement
	).checked;
	const laneCountVal = parseInt(
		(document.getElementById("k") as HTMLInputElement).value,
		10,
	);
	const dropPatternStr = (document.getElementById("note") as HTMLInputElement)
		.value;

	const currentLaneCount = config.get("laneCount");

	config.update({
		laneCount: laneCountVal,
		timeLimit: parseInt(timeStr, 10),
		keyMapping: keyMappingStr.split(""),
		hideEndText: hideEndText,
		isSoundMuted: isSoundMuted,
		enableVerticalJudgement: enableVerticalJudgement,
		dropPattern: dropPatternStr,
	});

	if (laneCountVal !== currentLaneCount) {
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

	GameTimeLayer.innerHTML = creatTimeText(config.get("timeLimit"));

	generateKeyMap();
	updateGamePattern();

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
	config.update({
		dropPattern: pattern,
	});

	updateGamePattern();

	gameRestart();
}

function showImg(input: HTMLInputElement) {
	const file = input.files![0];
	if (file) {
		const newUrl = window.URL.createObjectURL(file);
		config.update({
			skinUrl: newUrl,
		});
	}
}

function stair() {
	const k = config.get("laneCount");
	let pattern = "";

	for (let i = 1; i < k; ++i) {
		pattern += i.toString();
	}
	for (let i = k; i > 1; --i) {
		pattern += i.toString();
	}

	config.update({
		dropPattern: pattern,
	});
	updateGamePattern();

	gameRestart();
}

init();
