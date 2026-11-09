import "./globals.css";

export const metadata = {
  title: "1stWeb",
  description: "Welcome to 1stWeb.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
