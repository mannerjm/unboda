import { ImageResponse } from "next/og";

export const alt = "UNBODA";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #070d20 0%, #17163b 52%, #271b50 100%)",
          color: "white",
          padding: "76px 86px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 430,
            height: 430,
            borderRadius: "50%",
            right: -70,
            top: -120,
            background: "rgba(129, 101, 255, 0.26)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 280,
            height: 280,
            borderRadius: "50%",
            left: 80,
            bottom: -150,
            background: "rgba(232, 105, 162, 0.13)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 360,
            height: 360,
            right: 120,
            top: 130,
            borderRadius: "50%",
            border: "2px solid rgba(200, 190, 255, 0.25)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 220,
            height: 220,
            right: 190,
            top: 200,
            borderRadius: "50%",
            border: "2px solid rgba(255, 255, 255, 0.13)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 760,
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.22em",
              color: "#b9adff",
              fontWeight: 700,
            }}
          >
            PERSONAL AI MYEONGRI
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 86,
              fontWeight: 800,
              letterSpacing: "-0.05em",
            }}
          >
            UNBODA
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 30,
              color: "#c7cce0",
              lineHeight: 1.45,
            }}
          >
            Saju analysis · premium reports · AI consultation
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
