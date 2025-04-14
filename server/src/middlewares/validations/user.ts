import { ValidationChain, check } from "express-validator";
import { QueryResult } from "pg";
import db from "../../database/pool";
import { TUser } from "../../types/users";
import passwords from "../../utilities/passwords";

// A helper function to check the length
export const checkLength = (
  field: string,
  min: number,
  message: string
): ValidationChain => check(field).isLength({ min }).withMessage(message);

// CHECK IF THE USER NAME LENGTH IS AT LEAST 3 CHARACTERS.
const checkUserNameLength: ValidationChain = checkLength(
  "user_name",
  6,
  "USERNAME MUST BE AT LEAST 6 CHARACTERS LONG !"
);

// CHECK IF THE FIRST NAME LENGTH IS AT LEAST 3 CHARACTER
const checkFirstNameLength: ValidationChain = checkLength(
  "first_name",
  3,
  "THE FIRST NAME MUST BE AT LEAST 3 CHARACTERS!"
);

// CHECK IF THE FIRST NAME LENGTH IS AT LEAST 3 CHARACTER
const checkLastNameLength: ValidationChain = checkLength(
  "last_name",
  3,
  "THE LAST NAME MUST BE AT LEAST 3 CHARACTERS!"
);

const checkPasswordLength: ValidationChain = checkLength(
  "password",
  6,
  "PASSWORD MUST BE AT LEAST 6 CHARACTERS LONG !"
);

const checkIsEmail: ValidationChain = check("email")
  .isEmail()
  .withMessage("Invalid email format! Example: 'example@domain-name.com'");

// CHECK IF THE PASSWORD IS CORRECT.
const checkPassword: ValidationChain = check("password").custom(
  async (password: string, { req }) => {
    const connection = await db.connect();
    try {
      const result: QueryResult<TUser> = await connection.query(
        "SELECT * FROM users WHERE email = $1",
        [req.body.email]
      );
      const user: TUser = result.rows[0];

      if (user && !passwords.checkPassword(password, user.password)) {
        throw new Error("INCORRECT PASSWORD !");
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message !== " EMAIL DOES NOT EXIST !"
      ) {
        throw new Error(`Check Password: ${(error as Error).message}!`);
      }
    } finally {
      connection.release();
    }
  }
);

// Check if the use name exists in the database
const checkUserNameExists: ValidationChain = check("user_name").custom(
  async (user_name: string) => {
    const connection = await db.connect();
    try {
      const result: QueryResult<TUser> = await connection.query(
        "SELECT * FROM users WHERE user_name = $1",
        [user_name]
      );
      const user: TUser = result.rows[0];
      if (user) {
        throw new Error("USERNAME ALREADY EXISTS !");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`${(error as Error).message}!`);
      }
    } finally {
      connection.release();
    }
  }
);

//CHECK IF THE EMAIL EXISTS IN THE DATABASE.
const isEmailExist = (context: "register" | "login"): ValidationChain =>
  check("email").custom(async (email: string, { req }) => {
    // connect to the database
    const connection = await db.connect();
    try {
      // select the user from the database
      const result: QueryResult<TUser> = await db.query(
        "SELECT * FROM users WHERE email=$1",
        [email]
      );
      const user: TUser = result.rows[0];

      if (context === "login" && !user) {
        throw new Error(`EMAIL DOES NOT EXIST !`);
      }

      if (context === "register" && user) {
        throw new Error(`EMAIL ALREADY EXISTS !`);
      }

      req.user = user;
    } catch (error) {
      throw new Error(`${(error as Error).message}`);
    } finally {
      connection.release();
    }
  });
export const registerValidation = [
  checkIsEmail,
  checkPasswordLength,
  checkUserNameLength,
  checkFirstNameLength,
  checkLastNameLength,
  isEmailExist("register"),
  checkUserNameExists,
];
export const loginValidation = [
  checkIsEmail,
  checkPasswordLength,
  isEmailExist("login"),
  checkPassword,
];
