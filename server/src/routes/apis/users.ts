import { Router } from "express";

const userRoute: Router = Router();

userRoute.get("/", (req, res) => {
	res.send("users routes");
});

export default userRoute;
