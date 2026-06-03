import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

// Phong chu chinh: Be Vietnam Pro — thiet ke rieng cho tieng Viet, net gon
// gang, dau thanh dep. Gan vao dung bien CSS cu (--font-geist-sans) nen khong
// phai sua globals.css.
const sans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quy Cau Long",
  description: "So quy minh bach cho nhom cau long",
};

// Dat theme truoc khi paint -> tranh nhap nhay (FOUC).
// Uu tien lua chon da luu; chua co thi theo he dieu hanh; loi thi dung toi.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${sans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        {/* lop noise lam mem be mat, khong chan tuong tac */}
        <div className="grain" aria-hidden="true" />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
