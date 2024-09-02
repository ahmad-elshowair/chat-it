import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import config from "./configs/config";
import errorMiddleware from "./middlewares/error";
import routes from "./routes";

// create an instance of app
const app: Application = express();

// create port variable that is assigned from the config file
const port: number = config.port;

app.use(
	"/api/images",
	express.static(path.join(__dirname, "../public/images")),
);

// use the middleware of express.json and helmet and morgan
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());

// use the cors
app.use(cors());

// create a get request of home endpoint
app.get("/", (_req: Request, res: Response) => {
	res.send("Hello World!");
});

// use all routes
app.use("/api", routes);

// use middleware of error
app.use(errorMiddleware);

app.use((_req: Request, res: Response) => {
	res.status(404).json("YOU HAVE GOT LOST !");
});

// add listen to the app
app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
