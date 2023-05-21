type User = {
	user_id?: string;
	user_name: string;
	user_email: string;
	user_password: string;
	user_picture?: string;
	user_cover?: string;
	user_followers?: number[];
	user_following?: number[];
	is_admin?: boolean;
	user_created_at?: Date;
};

export default User;
