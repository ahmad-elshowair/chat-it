import { Request, Response, Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";

const uploadRouter = Router();

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		let { folder } = req.body;
		if (!folder) {
			console.error("folder name is undefined ");
			folder = "posts";
		}
		const uploadPath = path.join(__dirname, `../../../public/images/${folder}`);

		// Check if the directory exists
		if (!fs.existsSync(uploadPath)) {
			// If it doesn't exist, create the directory
			fs.mkdirSync(uploadPath, { recursive: true });
		}

		cb(null, uploadPath);
	},
	filename: (req, file, cb) => {
		const date = new Date();
		const uniqueSuffix = `${date.getDate()}-${
			date.getMonth() + 1
		}-${date.getFullYear()}-${date.getMilliseconds()}`;
		cb(null, `${uniqueSuffix}-${file.originalname}`);
	},
});

const upload = multer({ storage });

uploadRouter.post("/", upload.single("file"), (req: Request, res: Response) => {
	try {
		if (!req.file) {
			return res.status(400).json({ message: "No file uploaded" });
		}
		// Generate the relative file path for the URL
		const relativeFilePath = `api/images/${req.body.folder}/${req.file.filename}`;
		return res.status(200).json({
			message: "File uploaded successfully",
			filePath: relativeFilePath, // This is the relative path
		});
	} catch (error) {
		console.error(error as Error);
		res.status(500).json("Failed to upload file");
	}
});

export default uploadRouter;
