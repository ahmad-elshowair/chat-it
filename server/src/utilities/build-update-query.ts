import User from "../types/users";
import passwords from "./passwords";

export const buildUpdateQuery = (
	id: string,
	updates: Partial<User>,
): [string, (string | boolean | Date)[]] => {
	const fields: string[] = [];
	const values: (string | boolean | Date)[] = [];
	let index = 1;

	for (const [key, value] of Object.entries(updates)) {
		if (key === "password") {
			fields.push(`${key} = $${index}`);
			values.push(passwords.hashPassword(value as string));
		} else {
			fields.push(`${key} = $${index}`);
			values.push(value as string | boolean | Date);
		}
		index++;
	}
	values.push(id);
	const query = `UPDATE users SET ${fields.join(
		", ",
	)} WHERE user_id = $${index} RETURNING *`;
	return [query, values];
};
