export type TPost = {
	post_id?: string;
	user_id: string;
	description: string;
	image?: string;
	created_at?: string;
	updated_at?: Date;
	numberOfLikes: number;
	numberOfComments: number;
};
