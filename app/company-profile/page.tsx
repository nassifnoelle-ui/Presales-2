'use client'
import { useState, useEffect } from 'react'
import Topbar from '@/components/Topbar'

const DEFAULT = {
  technologies: ['Oracle APEX', 'Oracle ORDS', 'Umbraco CMS', 'ASP.NET', '.NET Core', 'Flutter', 'React', 'Next.js', 'Java Spring Boot', 'Node.js', 'Python'],
  certifications: ['UAEPASS integration certified', 'Oracle Partner Network', 'UAE IA standards compliance'],
  platforms: ['HubSpot CRM', 'Microsoft Azure', 'AWS', 'On-premise infrastructure', 'Dubai Now', 'WAF solutions'],
  sectors_served: ['UAE Federal Government', 'UAE Emirate Government', 'Healthcare', 'Financial Services', 'Real Estate', 'Education'],
  project_types: ['Government portal development', 'Supplier portal (Oracle APEX)', 'CMS website (Umbraco)', 'Mobile app (Flutter)', 'System integration', 'Digital transformation'],
  uae_gov_projects: 12,
  years_experience: 10,
  total_headcount: 85,
  available_developers: 12,
  available_architects: 3,
  available_pm: 4,
  pipeline_load: 'Medium',
  differentiators: ['Certified UAEPASS integration', 'Oracle APEX and Umbraco dual capability', 'Arabic RTL design expertise', 'UAE government track record', 'Sister company cybersecurity'],
  weaknesses: ['Limited capacity for multiple large concurrent projects', 'No in-house AI/ML team'],
  sister_services: ['Penetration testing', 'WAF configuration', 'UAE IA compliance review', 'Vulnerability assessment', 'Security monitoring (SOC)'],
}

type Profile = typeof DEFAULT

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<Profile>(DEFAULT)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('tech')

  useEffect(() => {
    try {
      const s = localStorage.getItem('emaratech_profile')
      if (s) setProfile({ ...DEFAULT, ...JSON.parse(s) })
    } catch {}
  }, [])

  function save() {
    localStorage.setItem('emaratech_profile', JSON.stringify(profile))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function updateList(field: keyof Profile, val: string) {
    const items = val.split('\n').map(s => s.trim()).filter(Boolean)
    setProfile(p => ({ ...p, [field]: items }))
  }

  function updateNum(field: keyof Profile, val: string) {
    setProfile(p => ({ ...p, [field]: parseInt(val) || 0 }))
  }

  function setPipeline(level: string) {
    setProfile(p => ({ ...p, pipeline_load: level }))
  }

  const TABS = [
    { id: 'tech', label: 'Technology' },
    { id: 'projects', label: 'Projects and sectors' },
    { id: 'team', label: 'Team and capacity' },
    { id: 'strengths', label: 'Strengths and risks' },
  ]

  const numFields: Array<{ field: keyof Profile; label: string }> = [
    { field: 'total_headcount', label: 'Total headcount' },
    { field: 'available_developers', label: 'Available developers' },
    { field: 'available_architects', label: 'Available architects' },
    { field: 'available_pm', label: 'Available PMs' },
  ]

  function tabStyle(id: string): React.CSSProperties {
    return {
      padding: '13px 16px',
      fontSize: 12,
      fontFamily: 'inherit',
      color: tab === id ? 'var(--dark)' : 'var(--textL)',
      border: 'none',
      background: 'transparent',
      borderBottom: tab === id ? '3px solid var(--bright)' : '3px solid transparent',
      cursor: 'pointer',
      fontWeight: tab === id ? 700 : 500,
    }
  }

  function pipeStyle(level: string): React.CSSProperties {
    const active = profile.pipeline_load === level
    return {
      padding: '8px 20px',
      borderRadius: 8,
      border: '1px solid var(--grayM)',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontWeight: 600,
      fontSize: 12,
      background: active ? 'var(--dark)' : 'var(--grayL)',
      color: active ? 'var(--bright)' : 'var(--textL)',
    }
  }

  return (
    <>
      <Topbar />
      <div className="subnav" style={{ paddingLeft: 24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="main">
        <div className="callout">
          This profile is used by the AI to score every RFP against emaratech capabilities. Keep it accurate — the more complete it is, the better the qualification scoring.
        </div>

        {tab === 'tech' && (
          <div className="g2">
            <div className="card">
              <div className="card-title">Technology stack</div>
              <label className="f-label">Technologies (one per line)</label>
              <textarea rows={10} value={profile.technologies.join('\n')} onChange={e => updateList('technologies', e.target.value)} />
              <div style={{ marginTop: 12 }}>
                <label className="f-label">Certifications</label>
                <textarea rows={4} value={profile.certifications.join('\n')} onChange={e => updateList('certifications', e.target.value)} />
              </div>
            </div>
            <div className="card">
              <div className="card-title">Platforms and infrastructure</div>
              <label className="f-label">Platforms (one per line)</label>
              <textarea rows={6} value={profile.platforms.join('\n')} onChange={e => updateList('platforms', e.target.value)} />
              <div style={{ marginTop: 12 }}>
                <label className="f-label">Sister company cybersecurity services</label>
                <textarea rows={6} value={profile.sister_services.join('\n')} onChange={e => updateList('sister_services', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {tab === 'projects' && (
          <div className="g2">
            <div className="card">
              <div className="card-title">Sectors served</div>
              <textarea rows={8} value={profile.sectors_served.join('\n')} onChange={e => updateList('sectors_served', e.target.value)} />
              <div className="g2" style={{ marginTop: 12 }}>
                <div>
                  <label className="f-label">UAE gov projects</label>
                  <input type="number" value={profile.uae_gov_projects} onChange={e => updateNum('uae_gov_projects', e.target.value)} />
                </div>
                <div>
                  <label className="f-label">Years in business</label>
                  <input type="number" value={profile.years_experience} onChange={e => updateNum('years_experience', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Project types delivered</div>
              <textarea rows={10} value={profile.project_types.join('\n')} onChange={e => updateList('project_types', e.target.value)} />
            </div>
          </div>
        )}

        {tab === 'team' && (
          <div className="g2">
            <div className="card">
              <div className="card-title">Team capacity</div>
              <div className="g2" style={{ gap: 12 }}>
                {numFields.map(({ field, label }) => (
                  <div key={String(field)}>
                    <label className="f-label">{label}</label>
                    <input
                      type="number"
                      value={profile[field] as number}
                      onChange={e => updateNum(field, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-title">Pipeline load</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {(['Low', 'Medium', 'High']).map(level => (
                  <button key={level} onClick={() => setPipeline(level)} style={pipeStyle(level)}>
                    {level}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--grayB)' }}>
                Low = Resource Availability 4-5 · Medium = 3-4 · High = 2-3
              </div>
            </div>
          </div>
        )}

        {tab === 'strengths' && (
          <div className="g2">
            <div className="card">
              <div className="card-title">Key differentiators</div>
              <textarea rows={10} value={profile.differentiators.join('\n')} onChange={e => updateList('differentiators', e.target.value)} />
            </div>
            <div className="card">
              <div className="card-title">Known limitations</div>
              <textarea rows={10} value={profile.weaknesses.join('\n')} onChange={e => updateList('weaknesses', e.target.value)} />
              <div className="f-hint" style={{ marginTop: 6 }}>Honest assessment — AI uses this to flag genuine risks in scoring</div>
            </div>
          </div>
        )}

        {saved && (
          <div style={{ background: 'var(--greenL)', border: '1px solid #9FE1CB', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#0F6E56' }}>
            Profile saved — AI will use this for all future analyses
          </div>
        )}

        <div className="row-btns">
          <button className="btn-primary" onClick={save}>Save profile</button>
          <button className="btn-second" onClick={() => { setProfile(DEFAULT); save() }}>Reset to defaults</button>
          <span style={{ fontSize: 11, color: 'var(--grayB)' }}>Saved locally · persists across sessions</span>
        </div>
      </div>
    </>
  )
}
