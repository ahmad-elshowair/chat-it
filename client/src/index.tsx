import ReactDOM from "react-dom/client";
import App from "./App";
import AuthProvider from "./context/AuthContext";
import { PostProvider } from "./context/PostContext";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <AuthProvider>
    <PostProvider>
      <App />
    </PostProvider>
  </AuthProvider>
);
