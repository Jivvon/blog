import { redirect } from 'next/navigation'
import { isPrivate } from '../lib/profile'

export default function Page() {
  redirect(isPrivate ? '/library' : '/about')
}
