import { useContext } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import config from "../../configs";
import { AuthContext } from "../../context/AuthContext";
import { registerUser } from "../../services/authService";
import { RegisterCredentials } from "../../types";
import "./register.css";
export const Register = () => {
  //EXTENT 'RegisterCredentials' TYPE ALIAS
  type TRegisterForm = RegisterCredentials & {
    confirm_password: string;
  };

  const { state, dispatch } = useContext(AuthContext);
  const { errors: backendErrors } = state;

  // USE USE FORM HOOK
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<TRegisterForm>();

  const onSubmit = async (data: TRegisterForm) => {
    try {
      // OMIT 'confirm_password' WHEN SENDING DATA TO API.
      const { confirm_password, ...userData } = data;
      await registerUser(userData, dispatch);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <section className="register-page">
      <header className="register-form-header">
        <img src={`${config.api_url}/api/images/chat-it-0.png`} alt="logo" />
        <h1>Chat it with Concern !</h1>
      </header>
      <form
        action=""
        className="register-form"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="register-form-body">
          <div className="register-form-body-input">
            <label className="form-label" htmlFor="first_name">
              First Name
            </label>
            <input
              className="form-control"
              type="text"
              id="first_name"
              placeholder="Mohammed"
              {...register("first_name", {
                required: "First Name is Required",
                minLength: {
                  value: 3,
                  message: "First name must be at least 3 characters!",
                },
              })}
            />
            {errors.first_name && (
              <span className="alert alert-warning p-2 text-danger mt-1 text-center">
                {errors.first_name.message}
              </span>
            )}
          </div>
          <div className="register-form-body-input">
            <label className="form-label" htmlFor="last_name">
              Last Name
            </label>
            <input
              className="form-control"
              type="text"
              id="last_name"
              placeholder="Khan"
              {...register("last_name", {
                required: "LAST NAME IS REQUIRED!",
                minLength: {
                  value: 3,
                  message: "Last name must be at least 3 characters!",
                },
              })}
            />
            {errors.last_name && (
              <span className="alert alert-warning p-2 text-danger mt-1 text-center">
                {errors.last_name.message}
              </span>
            )}
          </div>
          <div className="register-form-body-input">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              className="form-control"
              type="email"
              id="email"
              placeholder="exmaple@gmail.com"
              {...register("email", {
                required: "EMAIL IS REQUIRED!",
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message:
                    "Invalid email format! Example: 'example@domain-name.com'",
                },
              })}
            />
            {errors.email && (
              <span className="alert alert-warning p-2 text-danger mt-1 text-center">
                {errors.email.message}
              </span>
            )}
          </div>

          <div className="register-form-body-input">
            <label className="form-label" htmlFor="user_name">
              User Name
            </label>
            <input
              className="form-control"
              type="text"
              id="user_name"
              placeholder="mohammed-khan"
              {...register("user_name", {
                required: "USERNAME IS REQUIRED!",
                pattern: {
                  value: /^[a-z0-9_-]+$/,
                  message:
                    "USERNAME CAN ONLY CONTAIN LOWERCASE LETTERS, NUMBERS, UNDERSCORES, AND HYPHENS !",
                },
                minLength: {
                  value: 6,
                  message: "user name must be at least 6 characters !",
                },
                validate: {
                  noConsecutiveSymbols: (value: string) =>
                    (value && !/[-_]{2,}/.test(value)) ||
                    "USERNAME CANNOT CONTAIN CONSECUTIVE SYMBOLS!",
                  startWitLetterOrNumber: (value: string) =>
                    (value && /^[a-z]/.test(value)) ||
                    "USERNAME MUST START WITH A LETTER",
                },
              })}
            />
            {errors.user_name && (
              <span className="alert alert-warning p-2 text-danger mt-1 text-center">
                {errors.user_name.message}
              </span>
            )}
          </div>
          <div className="register-form-body-input">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              className="form-control"
              type="password"
              id="password"
              placeholder="***********"
              {...register("password", {
                required: "PASSWORD IS REQUIRED!",
                minLength: {
                  value: 8,
                  message: "PASSWORD MUST BE AT LEAST 8 CHARACTERS LONG!",
                },
              })}
            />
            {errors.password && (
              <span className="alert alert-warning p-2 text-danger mt-1 text-center">
                {errors.password.message}
              </span>
            )}
          </div>
          <div className="register-form-body-input">
            <label className="form-label" htmlFor="confirm_password">
              Confirm Password
            </label>
            <input
              className="form-control"
              type="password"
              id="confirm_password"
              placeholder="***********"
              {...register("confirm_password", {
                required: "CONFIRM PASSWORD IS REQUIRED!",
                validate: (value: string) =>
                  value === watch("password") || "PASSWORDS DO NOT MATCH !",
              })}
            />
            {errors.confirm_password && (
              <span className="alert alert-warning p-2 text-danger mt-1 text-center">
                {errors.confirm_password.message}
              </span>
            )}
          </div>
          <button className="btn btn-chat" type="submit">
            register
          </button>
          <Link to="/login" className="btn btn-homie">
            I'm homie
          </Link>
        </div>
        {backendErrors && backendErrors.length > 0 && (
          <article className="w-100 text-center">
            {backendErrors.map((error, index) => (
              <p
                key={index}
                className="alert alert-warning mt-3 p-2 text-danger"
              >
                {error}
              </p>
            ))}
          </article>
        )}
      </form>
    </section>
  );
};
