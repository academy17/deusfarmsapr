// src/app/layout.tsx
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
        </header>
        <main>{children}</main>
        <footer>
          <p>© academy17</p>
        </footer>
      </body>
    </html>
  );
}
