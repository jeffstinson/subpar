
import "./globals.css";

export const metadata = {
  title: "Subpar OS — Tuning Dashboard",
  description: "Subpar Tuning customer, vehicle, order, log and revision management."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
