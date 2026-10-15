import { APP_NAME } from "@/lib/brand";
import PlayForm from "./PlayForm";

export default function PlayPage() {
  return (
    <div className="play-wrap">
      <div className="play-card">
        <p className="play-brand">{APP_NAME}</p>
        <h1 className="play-title">Enter your quiz</h1>
        <p className="muted" style={{ marginBottom: "1.25rem" }}>
          Type your candidate ID and the PIN your teacher gives you at the venue.
        </p>
        <PlayForm />
      </div>
    </div>
  );
}
