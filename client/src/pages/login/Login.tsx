import { CircularProgress } from "@mui/material";
import { useContext, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { FaEye, FaEyeSlash } from "react-icons/fa";
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

  const imageUrl = `${config.api_url}/images/chat_it.png`;

  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <section className="vh-100 py-5">
      <div className="container d-flex justify-content-center align-items-center h-100 gap-5">
        <header className="login-page__header d-flex align-items-center justify-content-center flex-column gap-4">
          <img
            src={imageUrl}
            className="w-75"
            alt="logo"
            onError={(e) => {
              console.error("Error loading image: ", e);
              console.log("current src: ", e.currentTarget.src);
            }}
          />
          <h1 className="login-page__header-title d-none d-lg-block fw-bold fs-2 text-uppercase">
            A warm Welcome Back !
          </h1>
        </header>
        <form
          action=""
          onSubmit={handleSubmit(onSubmit)}
          className="login-page__form px-2 py-5  d-flex flex-column gap-4 align-items-center justify-content-center"
        >
          <div className="login-page__body d-flex flex-column gap-4">
            <div className="d-flex flex-column">
              <label
                className="form-label text-success fw-medium"
                htmlFor="email"
              >
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
            <div className="d-flex flex-column">
              <label
                className="form-label text-success fw-medium"
                htmlFor="password"
              >
                Password
              </label>

              <div className="relative d-flex justify-content-between form-control">
                <input
                  className="border-0 bg-transparent w-100"
                  type={showPassword ? "text" : "password"}
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
                <button
                  type="button"
                  className="border-0 bg-transparent"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <FaEyeSlash className="text-success" />
                  ) : (
                    <FaEye className="text-success" />
                  )}
                </button>
              </div>
              {errors.password && (
                <span className="alert alert-warning p-2 text-danger text-center mt-1">
                  {errors.password.message}
                </span>
              )}
            </div>
            <button className="btn btn-chat" type="submit">
              {state.loading ? <CircularProgress size={"20px"} /> : "Login"}
            </button>
            <Link to="/register" className="btn-new fw-light text-center">
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
