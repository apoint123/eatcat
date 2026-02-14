import { loadData, saveData } from "@/utils/storage";

export interface GameConfig {
	laneCount: number;
	timeLimit: number;
	keyMapping: string[];
	dropPattern: string;
	isSoundMuted: boolean;
	hideEndText: boolean;
	enableVerticalJudgement: boolean;
	skinUrl: string;
}

const STORAGE_KEY = "eatcat_config";

const DEFAULT_CONFIG: GameConfig = {
	laneCount: 4,
	timeLimit: 20,
	keyMapping: ["d", "f", "j", "k"],
	dropPattern: "!",
	isSoundMuted: false,
	hideEndText: false,
	enableVerticalJudgement: false,
	skinUrl: "/image/ClickBefore.png",
};

export class ConfigManager {
	private static instance: ConfigManager;
	private _config: GameConfig;

	private constructor() {
		this._config = this.loadFromStorage();
	}

	public static getInstance(): ConfigManager {
		if (!ConfigManager.instance) {
			ConfigManager.instance = new ConfigManager();
		}
		return ConfigManager.instance;
	}

	public get config(): GameConfig {
		return { ...this._config };
	}

	public get<K extends keyof GameConfig>(key: K): GameConfig[K] {
		return this._config[key];
	}

	public update(newConfig: Partial<GameConfig>): void {
		const mergedConfig = { ...this._config, ...newConfig };
		const validatedConfig = this.validate(mergedConfig);
		this._config = validatedConfig;
		this.saveToStorage();
	}

	public reset(): void {
		this._config = { ...DEFAULT_CONFIG };
		this.saveToStorage();
	}

	private loadFromStorage(): GameConfig {
		const data = loadData<GameConfig>(STORAGE_KEY);

		if (!data) {
			return { ...DEFAULT_CONFIG };
		}

		return this.validate({ ...DEFAULT_CONFIG, ...data });
	}

	private saveToStorage(): void {
		saveData(STORAGE_KEY, this._config);
	}

	private validate(config: GameConfig): GameConfig {
		let laneCount = Math.floor(Number(config.laneCount));
		if (Number.isNaN(laneCount) || laneCount < 1) laneCount = 4;
		if (laneCount > 10) laneCount = 10;

		let timeLimit = Math.floor(Number(config.timeLimit));
		if (Number.isNaN(timeLimit) || timeLimit < 1) timeLimit = 20;

		let keys = config.keyMapping;
		if (!Array.isArray(keys) || keys.length !== laneCount) {
			const fallbackKeys = "abcdefghijklmnopqrstuvwxyz1234567890".split("");
			keys = fallbackKeys.slice(0, laneCount);

			if (Array.isArray(config.keyMapping)) {
				for (
					let i = 0;
					i < Math.min(config.keyMapping.length, laneCount);
					i++
				) {
					const keyValue = config.keyMapping[i];
					if (typeof keyValue === "string") {
						keys[i] = keyValue;
					}
				}
			}
		}

		return {
			...config,
			laneCount,
			timeLimit,
			keyMapping: keys,
			isSoundMuted: Boolean(config.isSoundMuted),
			hideEndText: Boolean(config.hideEndText),
			enableVerticalJudgement: Boolean(config.enableVerticalJudgement),
			dropPattern: config.dropPattern || "!",
			skinUrl: config.skinUrl || DEFAULT_CONFIG.skinUrl,
		};
	}
}
