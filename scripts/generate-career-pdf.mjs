#!/usr/bin/env node

/**
 * Career PDF Generator
 * Captures the /career page from the running dev server and saves as PDF.
 *
 * Prerequisites: dev server must be running (yarn dev)
 *
 * Usage: node scripts/generate-career-pdf.mjs [output-path]
 * Default output: public/career.pdf
 */

import path from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const DEV_SERVER_URL = process.env.DEV_SERVER_URL || 'http://localhost:3020'

async function generatePDF(outputPath) {
  console.log(`Connecting to ${DEV_SERVER_URL}/career ...`)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  })

  const page = await browser.newPage()
  await page.goto(`${DEV_SERVER_URL}/career`, { waitUntil: 'networkidle0', timeout: 30000 })

  // Wait for fonts
  await page.evaluateHandle('document.fonts.ready')

  await page.evaluate(() => {
    // ── 불필요한 UI 요소 숨기기 ──
    document.querySelector('.pt-4.pb-2')?.style.setProperty('display', 'none') // 다운로드 버튼
    document.querySelector('header')?.style.setProperty('display', 'none')
    document.querySelector('nav')?.style.setProperty('display', 'none')
    document.querySelector('footer')?.style.setProperty('display', 'none')
    document.querySelector('h1')?.style.setProperty('display', 'none') // "Career" 제목

    // ── 상단 여백 제거 ──
    document.querySelectorAll('.divide-y, .space-y-4, .pt-6, .pb-8').forEach((el) => {
      el.style.paddingTop = '0'
      el.style.paddingBottom = '0'
      el.style.marginTop = '0'
    })

    // ── 전체 줄 간격 및 bullet 여백 줄이기 ──
    const prose = document.querySelector('.prose')
    if (prose) {
      prose.style.paddingTop = '0'
      prose.style.marginTop = '0'
      prose.style.lineHeight = '1.8'
      prose.style.fontSize = '14px'
    }
    // bullet(li) 간 여백 줄이기
    document.querySelectorAll('.prose li').forEach((li) => {
      li.style.marginTop = '0.1em'
      li.style.marginBottom = '0.1em'
    })
    // ul/ol 리스트 전후 여백 줄이기 (텍스트와 bullet 사이)
    document.querySelectorAll('.prose ul, .prose ol').forEach((list) => {
      list.style.marginTop = '0.2em'
      list.style.marginBottom = '0.2em'
      list.style.paddingLeft = '0.6em'
    })
    // p 태그 여백 줄이기
    document.querySelectorAll('.prose p').forEach((p) => {
      p.style.marginTop = '0.3em'
      p.style.marginBottom = '0.3em'
    })
    // h2, h3 여백 줄이기
    document.querySelectorAll('.prose h2').forEach((h2) => {
      h2.style.marginTop = '0.5em'
      h2.style.marginBottom = '0.3em'
    })
    document.querySelectorAll('.prose h3').forEach((h3) => {
      h3.style.marginTop = '0.4em'
      h3.style.marginBottom = '0.2em'
    })

    // ── 섹션(h2)별 페이지 구분 (비활성화) ──
    // document.querySelectorAll('.prose h2').forEach((h2, i) => {
    //   if (i > 0) {
    //     h2.style.pageBreakBefore = 'always'
    //     h2.style.paddingTop = '0'
    //   }
    // })

    // ── hr 구분선 숨기기 ──
    document.querySelectorAll('hr').forEach((hr) => (hr.style.display = 'none'))
  })

  console.log('Generating PDF...')
  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: {
      top: '0.4cm',
      right: '0.5cm',
      bottom: '0.5cm',
      left: '0.5cm',
    },
    printBackground: true,
    displayHeaderFooter: false,
  })

  await browser.close()
  console.log(`PDF saved to: ${outputPath}`)
}

// Main
const outputPath = process.argv[2] || path.join(ROOT, 'public', 'career.pdf')
generatePDF(outputPath).catch((err) => {
  console.error('Failed to generate PDF:', err)
  process.exit(1)
})
