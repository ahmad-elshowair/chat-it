import "./profileRightBar.css";
export const ProfileRightBar = () => {
	return (
		<section className="profile-right-bar">
			<article className="right-bar-info">
				<h3 className="info">Info</h3>

				<div className="d-flex flex-column ps-3">
					<p className="info-box">
						<span className="info-key">Live in:</span>
						<span className="info-value">Hanoi</span>
					</p>

					<p className="info-box">
						<span className="info-key">From:</span>
						<span className="info-value">Cairo</span>
					</p>
					<p className="m-0 info-box">
						<span className="info-key">Relationship:</span>
						<span className="info-value">Married</span>
					</p>
				</div>
			</article>
			<article></article>
		</section>
	);
};
