import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'

export async function publicExport() {
  const root = process.cwd()
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-public-export-'))
  const copy = async (relative) => {
    const target = path.join(temporary, relative)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.cp(path.join(root, relative), target, { recursive: true })
  }
  try {
    // Build from an explicit public source tree. No middleware is needed to hide
    // routes that do not exist in the exported artifact.
    for (const relative of [
      'package.json',
      'package-lock.json',
      'next.config.js',
      'contentlayer.config.ts',
      'tsconfig.json',
      'jsconfig.json',
      'next-env.d.ts',
      'postcss.config.js',
      'prettier.config.js',
      'eslint.config.mjs',
      'components',
      'layouts',
      'css',
      'lib/profile.js',
      'app/about',
      'app/layout.tsx',
      'app/not-found.tsx',
      'app/theme-providers.tsx',
      'app/seo.tsx',
      'app/robots.ts',
      'app/sitemap.ts',
      'data/authors',
      'data/headerNavLinks.ts',
      'data/siteMetadata.js',
      'data/logo.svg',
      'data/references-data.bib',
      'scripts/postbuild.mjs',
      'scripts/rss.mjs',
      'public/static/images',
      'public/static/favicons',
    ])
      await copy(relative)
    await fs.writeFile(path.join(temporary, 'app/tag-data.json'), '{}\n')
    await fs.writeFile(
      path.join(temporary, 'app/page.tsx'),
      "export { default, metadata } from './about/page'\n"
    )
    await fs.symlink(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'), 'dir')
    // Contentlayer resolves its root from PWD, rather than the child's actual cwd.
    const env = { ...process.env, BLOG_PROFILE: 'public', PWD: temporary, INIT_CWD: temporary }
    const build = spawnSync(
      process.execPath,
      [path.join(root, 'node_modules/next/dist/bin/next'), 'build'],
      {
        cwd: temporary,
        env,
        stdio: 'inherit',
      }
    )
    if (build.status !== 0) throw new Error(`Public static build failed (${build.status})`)
    const output = path.join(temporary, 'out')
    await fs.writeFile(
      path.join(output, '_redirects'),
      '/ /about 302\n/blog /about 302\n/blog/* /about 302\n/tags /about 302\n/tags/* /about 302\n/resume /about 302\n/resume/* /about 302\n/projects /about 302\n/projects/* /about 302\n'
    )
    await fs.writeFile(
      path.join(output, '_headers'),
      '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n'
    )
    await fs.cp(output, path.join(root, 'out'), { recursive: true })
    await fs.cp(path.join(temporary, '.contentlayer'), path.join(root, '.contentlayer'), {
      recursive: true,
    })
  } finally {
    await fs.rm(temporary, { recursive: true, force: true })
  }
}
