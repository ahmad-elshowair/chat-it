import { Feed } from "../../components/feed/Feed";
import { RightBar } from "../../components/rightBar/RightBar";
import { Sidebar } from "../../components/sidebar/Sidebar";
import { Topbar } from "../../components/topbar/Topbar";
import "./home.css";
export const Home = () => {
  return (
    <>
      <Topbar />
      <section className="home-container mt-3">
        <Sidebar />
        <Feed />
        <RightBar />
      </section>
    </>
  );
};
