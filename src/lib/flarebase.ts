import flarebase from "../lib/client-sdk";

// Hàm khởi tạo flarebase với token từ localStorage
export function getFlarebaseClient() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  return new flarebase(
    process.env.NEXT_PUBLIC_FLAREBASE_URL ||
      "https://flarebase.kuquaysut.workers.dev",
    token || undefined
  );
}

// Export một instance mặc định
const flarebaseClient = new flarebase(
  process.env.NEXT_PUBLIC_FLAREBASE_URL ||
    "https://flarebase.kuquaysut.workers.dev"
);

export default flarebaseClient;
