import { FileText, Shield, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface">
      <div className="max-w-2xl mx-auto px-8 py-16 text-center">
        <h1 className="font-display text-4xl text-navy mb-3">
          Estora
        </h1>
        <p className="text-secondary text-lg mb-12">
          Real estate transaction intelligence
        </p>

        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="card flex flex-col items-center gap-3 py-6">
            <FileText className="w-6 h-6 text-gold" strokeWidth={1.5} />
            <span className="text-sm font-medium text-primary">
              Agreement Analysis
            </span>
          </div>
          <div className="card flex flex-col items-center gap-3 py-6">
            <Shield className="w-6 h-6 text-gold" strokeWidth={1.5} />
            <span className="text-sm font-medium text-primary">
              Risk Detection
            </span>
          </div>
          <div className="card flex flex-col items-center gap-3 py-6">
            <BarChart3 className="w-6 h-6 text-gold" strokeWidth={1.5} />
            <span className="text-sm font-medium text-primary">
              Health Scoring
            </span>
          </div>
        </div>

        <a href="/login" className="btn-primary">
          Get Started
        </a>
      </div>
    </main>
  );
}
