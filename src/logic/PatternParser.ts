export const COMMAND_CHARS = ["@", "!", "#", "&", "+", "-", "%", "*"];

export function parsePattern(rawPattern: string, laneCount: number): string[] {
	if (!rawPattern) {
		return ["!"];
	}

	const chars = rawPattern.split("");
	const result: string[] = [];

	for (const char of chars) {
		if (char === "！") {
			result.push("!");
			continue;
		}

		if (COMMAND_CHARS.includes(char)) {
			result.push(char);
			continue;
		}

		const num = parseInt(char, 10);
		if (!Number.isNaN(num) && num >= 1 && num <= laneCount) {
			result.push(char);
		}
	}

	if (result.length === 0) {
		return ["!"];
	}

	return result;
}
