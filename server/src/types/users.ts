type User = {
	user_id?: string;
	user_name: string;
	email: string;
	password: string;
	picture?: string;
	cover?: string;
	followers?: number[];
	following?: number[];
	is_admin?: boolean;
	description?: string;
	city?: string;
	home_town?: string;
	created_at?: Date;
	updated_at?: Date;
};

export default User;
