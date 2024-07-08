type User = {
	user_id?: string;
	user_name: string;
	email: string;
	password: string;
	picture?: string;
	cover?: string;
	is_admin?: boolean;
	bio?: string;
	city?: string;
	home_town?: string;
	created_at?: Date;
	updated_at?: Date;
	first_name: string;
	last_name: string;
	marital_status: string;
};

export default User;
