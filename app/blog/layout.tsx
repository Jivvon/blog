import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { isPrivate } from '../../lib/profile'

export default function BlogLayout({ children }: { children: ReactNode }) {
  if (!isPrivate) redirect('/about')
  return children
}
