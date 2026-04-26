import { Navbar } from '@/components/layout/Navbar'

const GOALS = [
  {
    title: 'Accelerate AI adoption across CPF',
    description:
      'Partner with divisions to identify high-impact use cases and deliver AI-powered tools that reduce manual effort and unlock new capabilities.',
  },
  {
    title: 'Build a reusable AI platform',
    description:
      'Develop shared infrastructure, APIs, and libraries that teams can build on — so every new product ships faster than the last.',
  },
  {
    title: 'Cultivate an AI-ready workforce',
    description:
      'Run workshops, publish playbooks, and embed AI champions in divisions so officers can confidently leverage AI in their day-to-day work.',
  },
  {
    title: 'Ensure responsible and trustworthy AI',
    description:
      'Establish governance frameworks, bias checks, and human-in-the-loop safeguards so every product we ship is safe, fair, and auditable.',
  },
  {
    title: 'Measure and communicate impact',
    description:
      'Track outcomes — time saved, decisions improved, satisfaction scores — and share results openly so stakeholders can see the value we deliver.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-center text-xs text-amber-800">
        Note: This page contains synthetic data for demonstration purposes only.
      </div>
      <main className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-16">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-700 uppercase mb-3">
            — Who we are —
          </p>
          <h1 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">
            AI Enablement Office
          </h1>
          <p className="text-base text-slate-500 leading-relaxed max-w-xl">
            We are a cross-functional team within CPF dedicated to bringing practical, responsible AI to every corner of the organisation.
          </p>
        </div>

        {/* Vision */}
        <section className="mb-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600 mb-4">Vision</p>
          <blockquote className="border-l-4 border-indigo-500 pl-6">
            <p className="text-2xl font-semibold text-slate-900 leading-snug">
              A CPF where every officer is empowered by AI to serve members better, decide faster, and work with greater purpose.
            </p>
          </blockquote>
        </section>

        {/* Mission */}
        <section className="mb-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600 mb-4">Mission</p>
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <p className="text-base text-slate-700 leading-relaxed">
              We partner with CPF divisions to design, build, and scale AI products that are <strong className="text-slate-900">useful</strong>, <strong className="text-slate-900">trustworthy</strong>, and <strong className="text-slate-900">sustainable</strong>. By combining deep domain knowledge with engineering and AI expertise, we turn ambitious ideas into working tools — and ensure those tools keep improving long after launch.
            </p>
          </div>
        </section>

        {/* Goals */}
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600 mb-6">Goals</p>
          <div className="space-y-4">
            {GOALS.map((goal, i) => (
              <div
                key={i}
                className="flex gap-5 bg-white border border-slate-200 rounded-xl px-6 py-5 shadow-sm"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">{goal.title}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{goal.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  )
}
