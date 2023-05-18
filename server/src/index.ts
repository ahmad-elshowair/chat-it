import express, { Application, Request, Response } from "express";
import config from "./configs/config";

// create an instance of app
const app: Application = express();

// create port variable that is assigned from the config file
const port: number = config.port;

// create a get request of home endpoint
app.get("/", (_req: Request, res: Response) => {
	res.send("Hello World!");
});

// add listen to the app
app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
