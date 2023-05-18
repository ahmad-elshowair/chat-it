import express, { Application } from "express";
import config from "./configs/config";

// create an instance of app
const app: Application = express();

// create port variable that is assigned from the config file
const port: number = config.port;

// create a get request of home endpoint
app.get("/", (req, res) => {
	res.send("Hello World!");
});

// add listen to the app
app.listen(port, () => {
	console.log(`Server is running on port: ${port}`);
});
