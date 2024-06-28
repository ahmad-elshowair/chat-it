import { Feed } from "../../components/feed/Feed";
import { LeftBar } from "../../components/leftBar/leftBar";
import { RightBar } from "../../components/rightBar/RightBar";
import { Topbar } from "../../components/topbar/Topbar";
import "./home.css";
export const Home = () => {
	return (
		<>
			<Topbar />
			<section className="home-container">
				<LeftBar />
				<Feed />
				<RightBar />
			</section>
		</>
	);
};
