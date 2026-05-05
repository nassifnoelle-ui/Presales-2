import Topbar from '@/components/Topbar'
import Link from 'next/link'

export default function HomePage() {
  return (
    <>
      <Topbar />
      <div className="main">
        <div className="home-hero">
          <h1>Pre-sales AI Platform</h1>
          <p>Two intelligent tools that take you from RFP to submitted proposal — governed, scored, and approved.</p>

          <div className="tools-grid">
            <Link href="/qualify" className="tool-card">
              <div className="tool-icon" style={{ background: '#E0F5F3' }}>📋</div>
              <div className="tool-number">Tool 1</div>
              <div className="tool-name">Qualification</div>
              <div className="tool-desc">Upload an RFP and get an AI-powered bid/no-bid recommendation scored across 24 criteria — with full reasoning and override capability.</div>
              <div className="tool-steps">
                {['Upload RFP — PDF, Word, or Excel', 'AI scores 24 criteria with reasoning', 'Review and override any score', 'Get bid recommendation and risk flags'].map((s, i) => (
                  <div key={i} className="tool-step">
                    <div className="step-dot" style={{ background: '#2ED5C8' }} />
                    {s}
                  </div>
                ))}
              </div>
              <div className="tool-cta" style={{ background: '#043336', color: '#2ED5C8' }}>
                Open qualification tool →
              </div>
            </Link>

            <Link href="/proposal" className="tool-card">
              <div className="tool-icon" style={{ background: '#F5FAFA' }}>📄</div>
              <div className="tool-number">Tool 2</div>
              <div className="tool-name">Proposal generator</div>
              <div className="tool-desc">Once a deal is qualified, generate a complete technical proposal — all six parts, AI-drafted, editable on screen, and exported as a formatted Word document.</div>
              <div className="tool-steps">
                {['Enter opportunity details', 'Select proposal parts to generate', 'AI drafts all sections from RFP', 'Edit on screen and export to Word'].map((s, i) => (
                  <div key={i} className="tool-step">
                    <div className="step-dot" style={{ background: '#297D7D' }} />
                    {s}
                  </div>
                ))}
              </div>
              <div className="tool-cta" style={{ background: '#F5FAFA', color: '#043336', border: '1px solid #D5EEEC' }}>
                Open proposal generator →
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
