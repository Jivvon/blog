import { ResumeData } from './types'

function SectionTitle({ title }: { title: string }) {
  const accent = title.slice(0, 3)
  const rest = title.slice(3)
  return (
    <div className="acv-section">
      <div className="acv-section-header">
        <h2 className="acv-section-title">
          <span className="acv-section-title-accent">{accent}</span>
          {rest}
        </h2>
        <div className="acv-section-divider" />
      </div>
    </div>
  )
}

function Header({ personal }: { personal: ResumeData['personal'] }) {
  return (
    <header className="acv-header">
      <div className="acv-header-name">
        <span className="acv-header-firstname">{personal.firstName} </span>
        <span className="acv-header-lastname">{personal.lastName}</span>
      </div>
      <div className="acv-header-position">{personal.position}</div>
      <div className="acv-header-address">{personal.address}</div>
      <div className="acv-header-social">
        {personal.homepage && (
          <a href={`https://${personal.homepage}`}>
            <svg viewBox="0 0 576 512" xmlns="http://www.w3.org/2000/svg">
              <path d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1V472c0 22.1-17.9 40-40 40h-16c-1.1 0-2.2 0-3.3-.1-1.4.1-2.8.1-4.2.1H392c-22.1 0-40-17.9-40-40v-88c0-17.7-14.3-32-32-32h-64c-17.7 0-32 14.3-32 32v88c0 22.1-17.9 40-40 40h-55.9c-1.5 0-3-.1-4.5-.2-1.2.1-2.4.2-3.6.2h-16c-22.1 0-40-17.9-40-40v-120c0-2.7.2-5.4.5-8H32c-18 0-32-14-32-32.1 0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7l255.4 224.5c8 7 12 15 11 24z" />
            </svg>
            {personal.homepage}
          </a>
        )}
        {personal.github && (
          <>
            <span className="acv-header-social-sep">|</span>
            <a href={`https://github.com/${personal.github}`}>
              <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg">
                <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />
              </svg>
              {personal.github}
            </a>
          </>
        )}
        {personal.linkedin && (
          <>
            <span className="acv-header-social-sep">|</span>
            <a href={`https://www.linkedin.com/in/${personal.linkedin}`}>
              <svg viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                <path d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z" />
              </svg>
              {personal.linkedin}
            </a>
          </>
        )}
      </div>
    </header>
  )
}

function ExperienceEntry({ entry }: { entry: ResumeData['experience'][number] }) {
  return (
    <div className="acv-entry">
      <div className="acv-entry-header">
        <div className="acv-entry-title">{entry.company}</div>
        <div className="acv-entry-location">{entry.location}</div>
        <div className="acv-entry-position">{entry.role}</div>
        <div className="acv-entry-date">{entry.period}</div>
      </div>
      {entry.items && entry.items.length > 0 && (
        <ul className="acv-items">
          {entry.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EducationEntry({ entry }: { entry: ResumeData['education'][number] }) {
  return (
    <div className="acv-entry">
      <div className="acv-entry-header">
        <div className="acv-entry-title">{entry.institution}</div>
        <div className="acv-entry-location">{entry.location}</div>
        <div className="acv-entry-position">{entry.degree}</div>
        <div className="acv-entry-date">{entry.period}</div>
      </div>
    </div>
  )
}

function WritingEntry({ entry }: { entry: ResumeData['writing'][number] }) {
  return (
    <div className="acv-honor">
      <div className="acv-honor-date">{entry.date}</div>
      <div className="acv-honor-title">
        {entry.url ? <a href={entry.url}>{entry.title}</a> : entry.title}
      </div>
      <div className="acv-honor-location" />
    </div>
  )
}

function Footer({ name }: { name: string }) {
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return (
    <footer className="acv-footer">
      <div className="acv-footer-left">{dateStr}</div>
      <div className="acv-footer-center">{name} · Resume</div>
      <div className="acv-footer-right">1</div>
    </footer>
  )
}

export default function AwesomeCV({ data }: { data: ResumeData }) {
  return (
    <div className="acv-resume">
      <Header personal={data.personal} />

      <SectionTitle title="Summary" />
      <div className="acv-paragraph">
        {data.summary
          .trim()
          .split('\n\n')
          .map((para, i) => (
            <p key={i} style={{ marginBottom: i === 0 ? '0.5em' : 0 }}>
              {para.replace(/\n/g, ' ')}
            </p>
          ))}
      </div>

      <SectionTitle title="Experience" />
      <div className="acv-entries">
        {data.experience.map((entry, i) => (
          <ExperienceEntry key={i} entry={entry} />
        ))}
      </div>

      <SectionTitle title="Writing" />
      <div className="acv-honors">
        {data.writing.map((entry, i) => (
          <WritingEntry key={i} entry={entry} />
        ))}
      </div>

      <SectionTitle title="Education" />
      <div className="acv-entries">
        {data.education.map((entry, i) => (
          <EducationEntry key={i} entry={entry} />
        ))}
      </div>

      <Footer name={`${data.personal.firstName} ${data.personal.lastName}`} />
    </div>
  )
}
