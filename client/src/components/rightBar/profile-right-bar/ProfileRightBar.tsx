import { FaHome, FaMapMarkerAlt, FaRegGrinHearts } from "react-icons/fa";
import "./profileRightBar.css";
type ProfileRightBarProps = {
	bio?: string;
	city?: string;
	home_town?: string;
	marital_status?: string;
};
export const ProfileRightBar = ({
	bio,
	city,
	home_town,
	marital_status,
}: ProfileRightBarProps) => {
	return (
		<section className="profile-right-bar">
			<article className="right-bar-bio mb-3">
				<h3 className="bio-header">Bio</h3>
				<p className="bio-text ps-3">{bio}</p>
			</article>

			<article className="right-bar-info">
				<h3 className="info-header">Info</h3>

				<div className="d-flex flex-column ps-3">
					<p className="info-box">
						<span className="info-key">
							<FaHome />
						</span>
						<span className="info-value">{city}</span>
					</p>

					<p className="info-box">
						<span className="info-key">
							<FaMapMarkerAlt />
						</span>
						<span className="info-value">{home_town}</span>
					</p>
					<p className="m-0 info-box">
						<span className="info-key">
							<FaRegGrinHearts />
						</span>
						<span className="info-value">{marital_status}</span>
					</p>
				</div>
			</article>
		</section>
	);
};
