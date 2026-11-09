import "./globals.css";

export const metadata = {
  title: "1stWeb | Viewer Rewards",
  description: "Check in, earn points, and enter the monthly viewer raffle.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
