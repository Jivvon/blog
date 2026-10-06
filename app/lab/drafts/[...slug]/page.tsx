import Link from 'next/link'
import { notFound } from 'next/navigation'
import { allBlogs } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '../../../../components/MDXComponents'
import { isPrivate } from '../../../../lib/profile'

export const dynamic = 'force-dynamic'
export const metadata = { title: '초안 미리보기', robots: { index: false, follow: false } }

export default async function Draft({ params }: { params: Promise<{ slug: string[] }> }) {
  if (!isPrivate) notFound()
  const { slug } = await params
  const post = allBlogs.find((item) => item.slug === slug.join('/') && item.draft)
  if (!post) notFound()
  return (
    <article className="py-6">
      <Link href="/lab" className="text-primary-600">
        ← 개발 공간
      </Link>
      <p className="mt-8 text-sm text-amber-600">작성 중인 초안</p>
      <h1 className="mt-3 text-4xl font-bold">{post.title}</h1>
      <div className="prose dark:prose-invert mt-8 max-w-none">
        <MDXLayoutRenderer code={post.body.code} components={components} />
      </div>
    </article>
  )
}
