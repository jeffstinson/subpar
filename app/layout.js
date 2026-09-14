import "../globals.css";
import "./extra.css";
import "./mobile.css";
import "./dashboard.css";
import "./premium-flows.css";
import RouteBridge from "./RouteBridge";

export const metadata = {
  title: "Subpar OS — Tuning Dashboard",
  description: "Subpar Tuning customer, vehicle, order, log and revision management."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <RouteBridge />
        {children}
      </body>
    </html>
  );
}
