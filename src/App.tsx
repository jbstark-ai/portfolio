import { experience, profile, skills } from './profile'

export default function App() {
  return (
    <>
      <header className="nav">
        <a href="#top" className="logo">{profile.name}</a>
        <nav>
          <a href="#skills">Skills</a>
          <a href="#experience">Experience</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <p className="eyebrow">Available for freelance</p>
          <h1>Hi, I'm {profile.name}.<br /><span>{profile.role}</span></h1>
          <p className="lead">{profile.tagline}</p>
          <div className="cta">
            <a className="btn" href="#contact">Get in touch</a>
          </div>
        </section>

        <section id="skills">
          <h2>Skills</h2>
          <ul className="tags big">{skills.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>

        <section id="experience">
          <h2>Worked with</h2>
          <ul className="tags big">{experience.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>

        <section id="contact">
          <h2>Let's build something</h2>
          <div className="cta">
            {profile.email && <a className="btn" href={`mailto:${profile.email}`}>{profile.email}</a>}
            <a className={profile.email ? 'btn ghost' : 'btn'} href={profile.github}>GitHub</a>
          </div>
        </section>
      </main>

      <footer>© {new Date().getFullYear()} {profile.name}</footer>
    </>
  )
}