export function isNull(val: unknown): boolean {
	if (typeof val === "string") {
		const str = val.replace(/(^\s*)|(\s*$)/g, "");
		return str === "" || str === undefined || str === null;
	}
	return val === undefined || val === null;
}

export function randomFrom(min: number, max: number): number {
	const range = max - min;
	const rand = Math.random();
	return min + Math.round(rand * range);
}

export function parseElement(htmlString: string): HTMLElement {
	const parser = new DOMParser();
	const doc = parser.parseFromString(htmlString, "text/html");
	return doc.body.childNodes[0] as HTMLElement;
}

export function toStr(obj: unknown): string {
	if (typeof obj === "object") {
		return JSON.stringify(obj);
	} else {
		return String(obj);
	}
}
