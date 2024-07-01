import User from "../types/users";
import passwords from "./passwords";

export const buildInsertQuery = (
	user: Partial<User>,
): [string, (string | boolean | Date)[]] => {
	const entries: [string, string | boolean | Date][] = Object.entries(user);
	const keys: string[] = entries.map(([key]) => key);
	const values: (string | boolean | Date)[] = entries.map(([key, value]) =>
		key === "password" ? passwords.hashPassword(value as string) : value,
	);

	const columns = keys.join(", ");
	const placeHolders = keys.map((_, index) => `$${index + 1}`).join(", ");
	const query = `INSERT INTO users (${columns}) VALUES (${placeHolders}) RETURNING *;`;
	return [query, values];
};
