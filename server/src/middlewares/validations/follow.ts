import { check } from "express-validator";
import db from "../../database/pool";

const checkUser = check("user_id_followed").custom(async (user_id: string) => {
  // connect to the database
  const connection = await db.connect();
  try {
    // select the user from the database
    const user = await connection.query(
      "SELECT * FROM users WHERE user_id = $1",
      [user_id]
    );
    if (!user) {
      throw new Error("THE USER IS NOT FOUND !");
    }
  } catch (error) {
    // if there is an error throw it
    throw new Error(`${(error as Error).message}!`);
  } finally {
    // close the connection
    connection.release();
  }
});

export default {
  checkFollow: [checkUser],
};
