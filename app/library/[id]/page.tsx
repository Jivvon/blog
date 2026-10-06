import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isPrivate } from '../../../lib/profile'
import { readArchive, readArticle } from '../../../lib/archive'

export const dynamic = 'force-dynamic'
export const metadata = { title: '아카이브 읽기', robots: { index: false, follow: false } }

export default async function Article({ params }: { params: Promise<{ id: string }> }) {
  if (!isPrivate) notFound()
  const { id } = await params
  const index = await readArchive()
  const post = index.posts.find((item) => item.id === id)
  if (!post) notFound()
  const html = await readArticle(post)
  return (
    <article className="py-6">
      <Link href="/library" className="text-primary-600 text-sm">
        ← 서재로
      </Link>
      <header className="mt-8 space-y-4 border-b border-gray-200 pb-8 dark:border-gray-700">
        <h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="text-gray-500">
          {post.author} ·{' '}
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}
          </time>
        </p>
        <a
          href={post.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 inline-block"
        >
          Substack 원문 ↗
        </a>
      </header>
      <div
        className="prose dark:prose-invert prose-img:rounded-xl prose-pre:overflow-x-auto mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <footer className="mt-12 border-t border-gray-200 pt-6 text-sm text-gray-500 dark:border-gray-700">
        저자: {post.author} · 개인 열람을 위해 저장한 원문입니다.
      </footer>
    </article>
  )
}
