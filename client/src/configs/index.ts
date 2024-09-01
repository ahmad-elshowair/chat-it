import dotenv from "dotenv";

dotenv.config();

const config = {
	api_url: String(process.env.REACT_APP_API_URL),
};

export default config;
