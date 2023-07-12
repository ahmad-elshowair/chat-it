import { Friend } from "../friend/Friend";
import "./rightBar.css";
export const RightBar = () => {
  return (
    <aside className="right-bar pe-4">
      <article className="right-bar-events">
        <img
          src="/assets/gift.png"
          alt="ads"
          className="right-bar-events-image"
        />
        <p className="right-bar-events-text">
          <b>Azzura</b> and <b>3 others friends</b> have a birthday
        </p>
      </article>
      <figure className="right-bar-ads mt-3">
        <img src="/assets/ad.png" alt="ads" className="right-bar-ads-img" />
      </figure>
      <section className="right-bar-friends mt-5">
        <h4 className="right-bar-friends-heading">Friends</h4>
        <ul className="right-bar-friends-list">
          <Friend />
          <Friend />
          <Friend />
          <Friend />
        </ul>
      </section>
    </aside>
  );
};
