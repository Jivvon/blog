#!/usr/bin/env node

/**
 * Standalone Resume PDF Generator
 * Reads data/resume.yaml → builds HTML → captures PDF via Puppeteer
 *
 * Usage: node scripts/generate-resume-pdf.mjs [output-path]
 * Default output: public/resume.pdf
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'
import puppeteer from 'puppeteer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadResumeData() {
  const filePath = path.join(ROOT, 'data', 'resume.yaml')
  const fileContents = fs.readFileSync(filePath, 'utf8')
  return yaml.load(fileContents)
}

function sectionTitle(title) {
  const accent = title.slice(0, 3)
  const rest = title.slice(3)
  return `
    <div class="acv-section">
      <div class="acv-section-header">
        <h2 class="acv-section-title">
          <span class="acv-section-title-accent">${accent}</span>${rest}
        </h2>
        <div class="acv-section-divider"></div>
      </div>
    </div>`
}

function buildHTML(data) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const fullName = `${data.personal.firstName} ${data.personal.lastName}`

  const summaryParagraphs = data.summary
    .trim()
    .split('\n\n')
    .map((p, i) => {
      const style = i === 0 ? ' style="margin-bottom: 0.5em"' : ''
      return `<p${style}>${p.replace(/\n/g, ' ')}</p>`
    })
    .join('\n')

  const experienceEntries = data.experience
    .map(
      (entry) => `
    <div class="acv-entry">
      <div class="acv-entry-header">
        <div class="acv-entry-title">${entry.company}</div>
        <div class="acv-entry-location">${entry.location}</div>
        <div class="acv-entry-position">${entry.role}</div>
        <div class="acv-entry-date">${entry.period}</div>
      </div>
      ${
        entry.items && entry.items.length > 0
          ? `<ul class="acv-items">${entry.items.map((item) => `<li>${item}</li>`).join('\n')}</ul>`
          : ''
      }
    </div>`
    )
    .join('\n')

  const writingEntries = data.writing
    .map(
      (entry) => `
    <div class="acv-honor">
      <div class="acv-honor-date">${entry.date}</div>
      <div class="acv-honor-title">${entry.url ? `<a href="${entry.url}">${entry.title}</a>` : entry.title}</div>
      <div class="acv-honor-location"></div>
    </div>`
    )
    .join('\n')

  const educationEntries = data.education
    .map(
      (entry) => `
    <div class="acv-entry">
      <div class="acv-entry-header">
        <div class="acv-entry-title">${entry.institution}</div>
        <div class="acv-entry-location">${entry.location}</div>
        <div class="acv-entry-position">${entry.degree}</div>
        <div class="acv-entry-date">${entry.period}</div>
      </div>
    </div>`
    )
    .join('\n')

  const socialLinks = []
  if (data.personal.homepage) {
    socialLinks.push(`<a href="https://${data.personal.homepage}">
      <svg viewBox="0 0 576 512" xmlns="http://www.w3.org/2000/svg"><path d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1V472c0 22.1-17.9 40-40 40h-16c-1.1 0-2.2 0-3.3-.1-1.4.1-2.8.1-4.2.1H392c-22.1 0-40-17.9-40-40v-88c0-17.7-14.3-32-32-32h-64c-17.7 0-32 14.3-32 32v88c0 22.1-17.9 40-40 40h-55.9c-1.5 0-3-.1-4.5-.2-1.2.1-2.4.2-3.6.2h-16c-22.1 0-40-17.9-40-40v-120c0-2.7.2-5.4.5-8H32c-18 0-32-14-32-32.1 0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7l255.4 224.5c8 7 12 15 11 24z"/></svg>
      ${data.personal.homepage}</a>`)
  }
  if (data.personal.github) {
    socialLinks.push(`<a href="https://github.com/${data.personal.github}">
      <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg"><path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"/></svg>
      ${data.personal.github}</a>`)
  }
  if (data.personal.linkedin) {
    socialLinks.push(`<a href="https://www.linkedin.com/in/${data.personal.linkedin}">
      <svg viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg"><path d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z"/></svg>
      ${data.personal.linkedin}</a>`)
  }
  const socialHTML = socialLinks.join('<span class="acv-header-social-sep">|</span>')

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fullName} - Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --acv-awesome: #dc3522;
      --acv-darktext: #414141;
      --acv-text: #333333;
      --acv-graytext: #5d5d5d;
      --acv-lighttext: #999999;
      --acv-section-divider: #5d5d5d;
    }

    @page {
      size: A4;
      margin: 0.8cm 1.4cm 1.8cm 1.4cm;
    }

    body {
      font-family: 'Noto Sans KR', sans-serif;
      color: var(--acv-text);
      line-height: 1.2;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    a { color: inherit; text-decoration: none; }

    /* Header */
    .acv-header { text-align: center; margin-bottom: 6mm; }
    .acv-header-name { font-size: 32pt; line-height: 1.1; margin-bottom: 0.4mm; }
    .acv-header-firstname { font-weight: 300; color: var(--acv-graytext); }
    .acv-header-lastname { font-weight: 700; color: var(--acv-text); }
    .acv-header-position { font-size: 7.6pt; font-variant: small-caps; text-transform: lowercase; color: var(--acv-awesome); letter-spacing: 0.05em; margin-bottom: 0.4mm; }
    .acv-header-address { font-size: 8pt; font-style: italic; color: var(--acv-lighttext); margin-bottom: 2mm; }
    .acv-header-social { font-size: 6.8pt; color: var(--acv-text); display: flex; justify-content: center; align-items: center; gap: 0; }
    .acv-header-social a { display: inline-flex; align-items: center; gap: 0.3em; }
    .acv-header-social svg { width: 1em; height: 1em; fill: currentColor; }
    .acv-header-social-sep { margin: 0 0.8em; }

    /* Section */
    .acv-section { margin-top: 3mm; }
    .acv-section-header { display: flex; align-items: baseline; margin-bottom: 2.5mm; }
    .acv-section-title { font-size: 16pt; font-weight: 700; color: var(--acv-text); white-space: nowrap; line-height: 1; }
    .acv-section-title-accent { color: var(--acv-awesome); }
    .acv-section-divider { flex: 1; height: 0.9pt; background-color: var(--acv-section-divider); margin-left: 0.3em; align-self: center; }

    /* Paragraph */
    .acv-paragraph { font-size: 9pt; font-weight: 300; color: var(--acv-text); line-height: 1.4; margin-top: -1mm; }

    /* Entry */
    .acv-entries { margin-top: 2.5mm; }
    .acv-entry { margin-bottom: 1mm; }
    .acv-entry-header { display: grid; grid-template-columns: 1fr auto; align-items: baseline; }
    .acv-entry-title { font-size: 10pt; font-weight: 700; color: var(--acv-darktext); line-height: 1.4; }
    .acv-entry-location { font-size: 9pt; font-weight: 300; font-style: italic; color: var(--acv-awesome); text-align: right; }
    .acv-entry-position { font-size: 8pt; font-variant: small-caps; text-transform: lowercase; color: var(--acv-graytext); line-height: 1.4; }
    .acv-entry-date { font-size: 8pt; font-weight: 300; font-style: italic; color: var(--acv-graytext); text-align: right; }

    /* Items */
    .acv-items { margin: 0; padding: 0; padding-left: 2ex; list-style: disc; font-size: 9pt; font-weight: 300; color: var(--acv-text); line-height: 1.4; }
    .acv-items li { margin: 0; padding: 0; padding-left: 0.3ex; }
    .acv-items li::marker { font-size: 0.7em; }

    /* Honor */
    .acv-honors { margin-top: 0.5mm; }
    .acv-honor { display: grid; grid-template-columns: auto 1fr auto; gap: 0.8em; align-items: baseline; font-size: 9pt; }
    .acv-honor-date { color: var(--acv-graytext); white-space: nowrap; }
    .acv-honor-title { font-weight: 700; color: var(--acv-darktext); }

    /* Footer */
    .acv-footer { position: fixed; bottom: 0; left: 0; right: 0; display: grid; grid-template-columns: 1fr 1fr 1fr; font-size: 8pt; font-variant: small-caps; text-transform: lowercase; color: var(--acv-lighttext); padding: 0 1.4cm 0.5cm; }
    .acv-footer-left { text-align: left; }
    .acv-footer-center { text-align: center; }
    .acv-footer-right { text-align: right; }
  </style>
</head>
<body>
  <header class="acv-header">
    <div class="acv-header-name">
      <span class="acv-header-firstname">${data.personal.firstName} </span>
      <span class="acv-header-lastname">${data.personal.lastName}</span>
    </div>
    <div class="acv-header-position">${data.personal.position}</div>
    <div class="acv-header-address">${data.personal.address}</div>
    <div class="acv-header-social">${socialHTML}</div>
  </header>

  ${sectionTitle('Summary')}
  <div class="acv-paragraph">${summaryParagraphs}</div>

  ${sectionTitle('Experience')}
  <div class="acv-entries">${experienceEntries}</div>

  ${sectionTitle('Writing')}
  <div class="acv-honors">${writingEntries}</div>

  ${sectionTitle('Education')}
  <div class="acv-entries">${educationEntries}</div>

  <footer class="acv-footer">
    <div class="acv-footer-left">${today}</div>
    <div class="acv-footer-center">${fullName} · Resume</div>
    <div class="acv-footer-right">1</div>
  </footer>
</body>
</html>`
}

async function generatePDF(outputPath) {
  console.log('Loading resume data...')
  const data = loadResumeData()

  console.log('Building HTML...')
  const html = buildHTML(data)

  console.log('Launching browser...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  })

  const page = await browser.newPage()

  await page.setContent(html, { waitUntil: 'networkidle0' })

  // Wait for Google Fonts to load
  await page.evaluateHandle('document.fonts.ready')

  console.log('Generating PDF...')
  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: {
      top: '0.8cm',
      right: '1.4cm',
      bottom: '1.8cm',
      left: '1.4cm',
    },
    printBackground: true,
    displayHeaderFooter: false,
  })

  await browser.close()
  console.log(`PDF saved to: ${outputPath}`)
}

// Main
const outputPath = process.argv[2] || path.join(ROOT, 'public', 'resume.pdf')
const outputDir = path.dirname(outputPath)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

generatePDF(outputPath).catch((err) => {
  console.error('Failed to generate PDF:', err)
  process.exit(1)
})
