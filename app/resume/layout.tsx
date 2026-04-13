import { Noto_Sans_KR } from 'next/font/google'
import '@/css/resume-awesome.css'

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  display: 'swap',
  variable: '--font-noto-sans-kr',
})

export default function ResumeLayout({ children }: { children: React.ReactNode }) {
  return <div className={notoSansKR.variable}>{children}</div>
}
