import dotenv from "dotenv";

dotenv.config();

const config = {
	api_app: String(process.env.REACT_APP_API_APP),
};

export default config;
