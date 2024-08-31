import { supabase } from "./supabase";

export const uploadFileSupabase = async (file: File, folder: string) => {
	const filePath = `${folder}/${new Date().toISOString()}_${file.name}`;
	const { data, error } = await supabase.storage
		.from("chat-it")
		.upload(filePath, file);
	if (error) {
		console.error("Error uploading file:", error);
		throw new Error(`Error Uploading file: ${error.message}`);
	}
	// Log the response data from the upload.
	console.log("Upload response data:", data);

	// Attempt to retrieve the public URL of the uploaded file.
	const publicUrl = supabase.storage.from("chat-it").getPublicUrl(filePath)
		.data.publicUrl;

	if (!publicUrl) {
		throw new Error("Failed to get public URL of the uploaded file.");
	}
	return publicUrl;
};
