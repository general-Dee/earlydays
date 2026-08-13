import { ImageResponse } from "next/og";
import { site } from "@/lib/data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#16213E",
        }}
      >
        <div
          style={{
            width: 64,
            height: 6,
            background: "#F5A623",
            marginBottom: 32,
          }}
        />
        <div style={{ color: "#FBF7F0", fontSize: 96, fontWeight: 700 }}>{site.name}</div>
        <div style={{ display: "flex", color: "#F5A623", fontSize: 32, marginTop: 16 }}>
          Nursery &amp; Primary — {site.location}
        </div>
      </div>
    ),
    { ...size }
  );
}
