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
    const prose = document.querySelector('.prose')
    if (prose) {
      prose.style.paddingTop = '0'
      prose.style.marginTop = '0'
    }

    // ── 섹션(h2)별 페이지 구분 (첫 번째 제외) ──
    document.querySelectorAll('.prose h2').forEach((h2, i) => {
      if (i > 0) {
        h2.style.pageBreakBefore = 'always'
        h2.style.paddingTop = '0'
      }
    })

    // ── hr 구분선 숨기기 (페이지 브레이크가 대체) ──
    document.querySelectorAll('hr').forEach((hr) => (hr.style.display = 'none'))
  })

  console.log('Generating PDF...')
  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: {
      top: '0.8cm',
      right: '1cm',
      bottom: '1cm',
      left: '1cm',
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
