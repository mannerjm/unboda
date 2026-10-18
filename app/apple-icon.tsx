import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #ff6f61, #8a6dff)", borderRadius: 39 }}>
      <div style={{ width: 108, height: 108, border: "3px solid rgba(255,255,255,0.75)", borderRadius: "50%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 17, height: 17, background: "#fff", borderRadius: "50%" }} />
        <div style={{ width: 36, height: 36, background: "#fff", borderRadius: "50%", position: "absolute", top: 0, right: 0 }} />
      </div>
    </div>, { ...size }
  );
}
