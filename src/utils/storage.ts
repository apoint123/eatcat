import { isNull } from "./common.js";

export function saveData(key: string, value: unknown): void {
	if (isNull(key)) return;
	try {
		const data =
			typeof value === "object" ? JSON.stringify(value) : String(value);
		localStorage.setItem(key, data);
	} catch (e) {
		console.error("Save data failed:", e);
	}
}

export function loadData<T = string>(key: string): T | null {
	if (isNull(key)) return null;
	const value = localStorage.getItem(key);

	if (value === null) {
		return null;
	}

	try {
		if (/^(\{|\[|\d|true|false)/.test(value)) {
			return JSON.parse(value);
		}
	} catch {
		// 返回字符串原值
	}

	return value as T;
}

export function removeData(key: string): void {
	localStorage.removeItem(key);
}

export function clearAllData(): void {
	localStorage.clear();
}
