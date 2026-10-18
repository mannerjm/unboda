import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #ff6f61, #8a6dff)", borderRadius: 112 }}>
      <div style={{ width: 307, height: 307, border: "10px solid rgba(255,255,255,0.75)", borderRadius: "50%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 48, height: 48, background: "#fff", borderRadius: "50%" }} />
        <div style={{ width: 102, height: 102, background: "#fff", borderRadius: "50%", position: "absolute", top: 0, right: 0 }} />
      </div>
    </div>, { ...size }
  );
}
