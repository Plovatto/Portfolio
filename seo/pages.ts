import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { PROFILE } from '../src/constants/profile.ts'
import { PROJECTS } from '../src/constants/projects.ts'
import type { Project } from '../src/constants/projects.ts'

export const SITE_URL = 'https://plovatto.dev'
const SHARE_IMAGE = `${SITE_URL}/og.jpg`
const KNOWS_ABOUT = ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Express', 'MySQL', 'SQL']
const [firstName, ...surnames] = PROFILE.fullName.split(' ')
const lastName = surnames.join(' ')

export type PageLanguage = 'pt' | 'en'

interface PageLocale {
  path: string
  htmlLang: string
  ogLocale: string
}

export const PAGES: Record<PageLanguage, PageLocale> = {
  pt: { path: '/', htmlLang: 'pt-BR', ogLocale: 'pt_BR' },
  en: { path: '/en/', htmlLang: 'en', ogLocale: 'en_US' },
}

interface Commit {
  title: string
  org: string
}

export interface Translation {
  meta: {
    title: string
    description: string
    shareDescription: string
    shareImageAlt: string
    siteDescription: string
  }
  hero: { role: string; lede: string }
  projects: { title: string } & Record<Project['id'], { description: string }>
  experience: {
    commits: Record<'fullStack' | 'degree' | 'technical', Commit>
  }
}

const HEAD_MARKER = '<!--seo:head-->'
const NOSCRIPT_MARKER = '<!--seo:noscript-->'
const HTML_TAG = /<html lang="[^"]*">/

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function pageUrl(language: PageLanguage): string {
  return `${SITE_URL}${PAGES[language].path}`
}

export function structuredData(language: PageLanguage, t: Translation) {
  const person = `${SITE_URL}/#person`
  const website = `${SITE_URL}/#website`
  const url = pageUrl(language)
  const { commits } = t.experience

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': `${url}#profile`,
        url,
        name: t.meta.title,
        description: t.meta.description,
        inLanguage: PAGES[language].htmlLang,
        isPartOf: { '@id': website },
        mainEntity: { '@id': person },
      },
      {
        '@type': 'Person',
        '@id': person,
        name: PROFILE.fullName,
        alternateName: PROFILE.name,
        jobTitle: t.hero.role,
        description: t.meta.description,
        email: `mailto:${PROFILE.email}`,
        url: `${SITE_URL}/`,
        image: SHARE_IMAGE,
        address: { '@type': 'PostalAddress', addressCountry: 'BR' },
        worksFor: { '@type': 'Organization', name: commits.fullStack.org },
        alumniOf: [commits.degree.org, commits.technical.org].map((name) => ({
          '@type': 'EducationalOrganization',
          name,
        })),
        knowsAbout: KNOWS_ABOUT,
        sameAs: [PROFILE.github, PROFILE.linkedin],
      },
      {
        '@type': 'WebSite',
        '@id': website,
        url: `${SITE_URL}/`,
        name: PROFILE.fullName,
        alternateName: PROFILE.name,
        description: t.meta.siteDescription,
        inLanguage: [PAGES.pt.htmlLang, PAGES.en.htmlLang],
        publisher: { '@id': person },
      },
    ],
  }
}

export function renderHead(language: PageLanguage, t: Translation): string {
  const other: PageLanguage = language === 'pt' ? 'en' : 'pt'
  const url = pageUrl(language)
  const meta = (attribute: 'name' | 'property', key: string, value: string) =>
    `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`
  const jsonLd = JSON.stringify(structuredData(language, t)).replaceAll('<', '\\u003c')

  return [
    meta('name', 'description', t.meta.description),
    `<link rel="canonical" href="${url}" />`,
    `<link rel="alternate" hreflang="${PAGES.pt.htmlLang}" href="${pageUrl('pt')}" />`,
    `<link rel="alternate" hreflang="${PAGES.en.htmlLang}" href="${pageUrl('en')}" />`,
    `<link rel="alternate" hreflang="x-default" href="${pageUrl('pt')}" />`,
    meta('property', 'og:type', 'profile'),
    meta('property', 'og:locale', PAGES[language].ogLocale),
    meta('property', 'og:locale:alternate', PAGES[other].ogLocale),
    meta('property', 'og:site_name', PROFILE.fullName),
    meta('property', 'og:title', t.meta.title),
    meta('property', 'og:description', t.meta.shareDescription),
    meta('property', 'og:url', url),
    meta('property', 'og:image', SHARE_IMAGE),
    meta('property', 'og:image:type', 'image/jpeg'),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('property', 'og:image:alt', t.meta.shareImageAlt),
    meta('property', 'profile:first_name', firstName),
    meta('property', 'profile:last_name', lastName),
    meta('name', 'twitter:card', 'summary_large_image'),
    `<title>${escapeHtml(t.meta.title)}</title>`,
    `<script type="application/ld+json">${jsonLd}</script>`,
  ].join('\n    ')
}

export function renderNoscript(t: Translation): string {
  const projects = PROJECTS.map(
    (project) =>
      `<li><a href="${project.preview}">${escapeHtml(project.name)}</a>: ${escapeHtml(t.projects[project.id].description)}</li>`,
  ).join('')

  return [
    '<noscript>',
    '<main style="max-width: 44rem; padding: 2rem; font-family: system-ui, sans-serif">',
    `<h1>${escapeHtml(PROFILE.fullName)}</h1>`,
    `<p>${escapeHtml(t.hero.role)}</p>`,
    `<p>${escapeHtml(t.hero.lede)}</p>`,
    `<h2>${escapeHtml(t.projects.title)}</h2>`,
    `<ul>${projects}</ul>`,
    `<p><a href="mailto:${PROFILE.email}">${PROFILE.email}</a> · <a href="${PROFILE.github}">GitHub</a> · <a href="${PROFILE.linkedin}">LinkedIn</a></p>`,
    '</main>',
    '</noscript>',
  ].join('\n    ')
}

export function renderPage(html: string, language: PageLanguage, t: Translation): string {
  for (const marker of [HEAD_MARKER, NOSCRIPT_MARKER]) {
    if (!html.includes(marker)) throw new Error(`index.html is missing ${marker}`)
  }
  if (!HTML_TAG.test(html)) throw new Error('index.html is missing <html lang>')

  return html
    .replace(HTML_TAG, `<html lang="${PAGES[language].htmlLang}">`)
    .replace(HEAD_MARKER, () => renderHead(language, t))
    .replace(NOSCRIPT_MARKER, () => renderNoscript(t))
}

export function seoPages(): Plugin {
  let root = process.cwd()
  let outDir = 'dist'
  let english: string | undefined
  const translation = (language: PageLanguage): Translation =>
    JSON.parse(readFileSync(join(root, 'src/locales', language, 'translation.json'), 'utf8'))

  return {
    name: 'seo-pages',
    configResolved(config) {
      root = config.root
      outDir = resolve(config.root, config.build.outDir)
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        if (!context.server) english = renderPage(html, 'en', translation('en'))
        return renderPage(html, 'pt', translation('pt'))
      },
    },
    writeBundle() {
      if (!english) return
      mkdirSync(join(outDir, 'en'), { recursive: true })
      writeFileSync(join(outDir, 'en', 'index.html'), english)
    },
  }
}
