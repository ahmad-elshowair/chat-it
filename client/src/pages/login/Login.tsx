import { CircularProgress } from "@mui/material";
import { useContext } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import config from "../../configs";
import { AuthContext } from "../../context/AuthContext";
import { loginUser } from "../../services/authService";
import { LoginCredentials } from "../../types";
import "./login.css";

export const Login = () => {
  const { state, dispatch } = useContext(AuthContext);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>();

  const onSubmit: SubmitHandler<LoginCredentials> = async (
    loginData: LoginCredentials
  ) => {
    try {
      await loginUser(loginData, dispatch);
    } catch (error) {
      console.log(error);
    }
  };
  console.log(state.errors);
  const imageUrl = `${config.api_url}/api/images/chat_it.png`;
  console.log("Image URL: ", imageUrl);
  console.log("API: ", config.api_url);

  return (
    <section className="login-page">
      <div className="login-page__container">
        <header className="login-page__header">
          <img
            src={imageUrl}
            alt="logo"
            onError={(e) => {
              console.error("Error loading image: ", e);
              console.log("current src: ", e.currentTarget.src);
            }}
          />
          <h1 className="login-page__header-title">A warm Welcome Back !</h1>
        </header>
        <form
          action=""
          onSubmit={handleSubmit(onSubmit)}
          className="login-page__form"
        >
          <div className="login-page__body">
            <div className="login-page__body-input">
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <input
                className="form-control"
                type="email"
                id="email"
                placeholder="exmaple@gmail.com"
                autoComplete="off"
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
                <span className="alert alert-warning p-2 text-danger text-center mt-1">
                  {errors.email.message}
                </span>
              )}
            </div>
            <div className="login-page__body-input">
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
                <span className="alert alert-warning p-2 text-danger text-center mt-1">
                  {errors.password.message}
                </span>
              )}
            </div>
            <button className="btn btn-chat" type="submit">
              {state.loading ? <CircularProgress size={"20px"} /> : "Login"}
            </button>
            <Link to="/register" className="btn btn-new">
              I'm new Here!
            </Link>
          </div>
          {state.errors && state.errors.length > 0 && (
            <article className="w-100 text-center">
              {state.errors.map((error, index) => (
                <p
                  key={index}
                  className="alert alert-warning p-2 mt-3 text-danger"
                >
                  {error}
                </p>
              ))}
            </article>
          )}
        </form>
      </div>
    </section>
  );
};
