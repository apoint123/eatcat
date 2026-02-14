import { loadData, saveData } from "../utils/storage";

export enum GameStatus {
	IDLE = 0,
	PLAYING = 1,
	ENDED = 2,
}

export interface BlockEntity {
	cell: number;
	id: string;
}

export class GameState {
	public status = GameStatus.IDLE;
	public score = 0;
	public bestScore = 0;

	public remainingTime = 0;
	private startTime = 0;
	private endTime = 0;

	public blockQueue: BlockEntity[] = [];
	public currentBlockIndex = 0;

	public patternCursor = 0;
	public lastLaneIndex = 0;

	constructor() {
		const savedBest = loadData<number>("best-score");
		this.bestScore = savedBest || 0;
	}

	public init(timeLimit: number) {
		this.status = GameStatus.IDLE;
		this.score = 0;
		this.remainingTime = timeLimit;

		this.startTime = 0;
		this.endTime = 0;

		this.blockQueue = [];
		this.currentBlockIndex = 0;

		this.patternCursor = 0;
		this.lastLaneIndex = 0;
	}

	public startGame() {
		if (this.status === GameStatus.PLAYING) return;

		this.status = GameStatus.PLAYING;
		this.startTime = Date.now();
		this.endTime = 0;
	}

	public finishGame() {
		if (this.status === GameStatus.ENDED) return;

		this.status = GameStatus.ENDED;
		this.endTime = Date.now();

		if (this.score > this.bestScore) {
			this.bestScore = this.score;
			saveData("best-score", this.bestScore);
		}
	}

	public addScore(points: number = 1) {
		this.score += points;
	}

	public tickTimer(): boolean {
		if (this.status !== GameStatus.PLAYING) return false;

		this.remainingTime--;
		return this.remainingTime <= 0;
	}

	public get duration(): number {
		const end = this.endTime || Date.now();
		const start = this.startTime || end;
		return Math.max(1, end - start);
	}

	public get clicksPerSecond(): number {
		return (this.score * 1000) / this.duration;
	}

	public get bpmEquivalent(): number {
		return (this.score * 15000) / this.duration;
	}
}
