export type TPost = {
	post_id?: string;
	user_id?: string;
	description?: string;
	image?: string;
	created_at?: Date;
	updated_at?: Date;
	number_of_likes: number;
	number_of_comments: number;
	user_name?: string;
};
