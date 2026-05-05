import './globals.css'

export const metadata = {
  title: 'emaratech Pre-sales Platform',
  description: 'Qualification and proposal generation tool',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
