import { useEffect, useState } from 'react';
import { fetchAcademicDossier } from '../api';
import './dossier.css';

type Dossier = {
  profile: string[];
  timeline: string[];
  pipeline: { university: string; lab: string; status: string; next: string }[];
  proposal: { title: string; fields: Record<string, string> };
  source: string;
};
export default function AcademicDossier({ compact = false, view = 'research' }: { compact?: boolean; view?: 'research' | 'profile' | 'milestones' | 'universities' }) {
  const [data, setData] = useState<Dossier | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    fetchAcademicDossier().then(value => {
      if (active) setData(value);
    }).catch(() => { if (active) setError('Unable to load your dossier. Refresh to retry.'); });
    return () => { active = false; };
  }, []);
  if (error || !data) return <p role="status">{error || 'Loading your dossier…'}</p>;
  if (compact) return <section className="bklit-frame dossier-summary"><div className="bklit-frame-panel space-y-4">
    <h2 className="text-lg font-bold">Research & admissions overview</h2>
    <p>{data.proposal.title}</p>
    <div className="dossier-stats"><span><b>{data.pipeline.length}</b> university records</span><span><b>{data.timeline.length}</b> recorded milestones</span></div>
    <p className="text-xs text-zinc-400">{data.source}</p>
    <a href="#dashboard/academics">Open research</a>
  </div></section>;
  return <>
    {view === 'research' && <section className="bklit-frame"><div className="bklit-frame-panel space-y-4">
      <h2 className="text-lg font-bold">{data.proposal.title}</h2>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(data.proposal.fields).map(([label, value]) =>
          <div key={label}><p className="text-xs text-zinc-400">{label}</p><p className="text-sm">{value}</p></div>)}
      </div>
      <p className="text-xs text-zinc-400">{data.source}</p>
    </div></section>}
    {view === 'profile' && <section className="bklit-frame"><div className="bklit-frame-panel space-y-3">
      <h2 className="text-lg font-bold">About me</h2>
      <dl className="profile-fields">{data.profile.map(item => {
        const split = item.indexOf(':');
        return <div key={item}><dt>{item.slice(0, split)}</dt><dd>{item.slice(split + 1).trim()}</dd></div>;
      })}</dl>
    </div></section>}
    {view === 'universities' && <section className="bklit-frame"><div className="bklit-frame-panel space-y-4">
      <h2 className="text-lg font-bold">University progress</h2>
      {data.pipeline.map(item => <article key={item.university} className="university-record">
        <h3 className="font-semibold">{item.university}</h3>
        <p className="text-sm text-zinc-400">{item.lab}</p>
        <p className="university-status">{item.status}</p>
        <p className="text-sm text-zinc-400">{item.next}</p>
      </article>)}
    </div></section>}
    {view === 'milestones' && <section className="bklit-frame"><div className="bklit-frame-panel space-y-3">
      <h2 className="text-lg font-bold">Recorded milestones</h2>
      <ol className="dossier-timeline">{data.timeline.map((item, i) => <li key={i}>{item}</li>)}</ol>
    </div></section>}
  </>;
}
