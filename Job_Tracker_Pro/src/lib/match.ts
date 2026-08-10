/* ============================================================
   JD ↔ resume matching engine.

   Everything here is a pure function over strings, so it can be
   unit-tested without React and without the store. The UI in
   JobDetail's "match" tab is a thin shell over these.
   ============================================================ */

/* Words that carry no signal in a job description. Kept deliberately
   short — over-filtering hides real requirements like "own" or "build". */
const STOP = new Set(`a an and are as at be been being by for from has have if in
into is it its of on or our so than that the their them then there these they this
to too was we were what when where which who will with would you your yours us can
may might must shall should could about above after again against all also am any
because before below between both during each few further here how more most other
same some such only own very s t don now i me my myself he she his her do does did
doing but while up down out off over under once he's ll re ve ain aren couldn didn
doesn hadn hasn haven isn ma mightn mustn needn shan shouldn wasn weren won wouldn`
  .split(/\s+/).filter(Boolean));

/* Multi-word phrases worth catching as a single token. Without this,
   "machine learning" would split into two weak unigrams. */
const PHRASES = [
  'machine learning', 'deep learning', 'natural language processing', 'large language model',
  'large language models', 'data science', 'data analysis', 'data analytics', 'data engineering',
  'data pipeline', 'data pipelines', 'data visualization', 'data warehouse', 'business intelligence',
  'a/b testing', 'ab testing', 'ab test', 'experiment design', 'experimentation',
  'product management', 'product analytics', 'product strategy', 'go to market',
  'stakeholder management', 'cross functional', 'cross-functional',
  'prompt engineering', 'fine tuning', 'fine-tuning', 'vector database', 'semantic search',
  'retrieval augmented generation', 'knowledge graph', 'feature engineering',
  'time series', 'predictive model', 'predictive modeling', 'statistical analysis',
  'root cause', 'self serve', 'self-serve', 'source of truth', 'north star',
  'people analytics', 'customer success', 'revenue operations', 'growth marketing',
];

/* Skill vocabulary. A hit here is worth more than a generic keyword hit,
   because these are the things an ATS and a human screener both look for. */
export const SKILL_VOCAB: Record<string, string[]> = {
  languages: ['python', 'sql', 'r', 'javascript', 'typescript', 'java', 'scala', 'go', 'bash'],
  data: ['pandas', 'numpy', 'spark', 'airflow', 'dbt', 'snowflake', 'bigquery', 'redshift',
    'postgres', 'postgresql', 'mysql', 'mongodb', 'etl', 'elt', 'data pipeline', 'data warehouse'],
  bi: ['tableau', 'looker', 'power bi', 'powerbi', 'mode', 'metabase', 'superset', 'excel',
    'dashboard', 'data visualization', 'business intelligence'],
  ml: ['machine learning', 'deep learning', 'scikit-learn', 'sklearn', 'pytorch', 'tensorflow',
    'xgboost', 'regression', 'classification', 'clustering', 'nlp',
    'natural language processing', 'feature engineering', 'predictive modeling'],
  llm: ['llm', 'large language model', 'large language models', 'gpt', 'claude', 'openai',
    'anthropic', 'rag', 'retrieval augmented generation', 'embedding', 'embeddings',
    'vector database', 'langchain', 'agent', 'agents', 'agentic', 'prompt engineering',
    'fine tuning', 'fine-tuning', 'evaluation', 'eval', 'evals', 'semantic search'],
  stats: ['statistics', 'statistical analysis', 'a/b testing', 'ab testing', 'experimentation',
    'experiment design', 'hypothesis', 'causal', 'significance', 'regression', 'forecasting',
    'time series'],
  product: ['roadmap', 'product management', 'product analytics', 'product strategy', 'prd',
    'user research', 'prioritization', 'kpi', 'okr', 'north star', 'go to market'],
  ops: ['stakeholder management', 'cross functional', 'cross-functional', 'process improvement',
    'automation', 'documentation', 'reporting', 'operations'],
  cloud: ['aws', 'gcp', 'azure', 'docker', 'kubernetes', 'git', 'github', 'ci/cd', 'api', 'rest'],
};

/* Flattened skill → category lookup, built once. */
const SKILL_INDEX: Record<string, string> = (() => {
  const idx: Record<string, string> = {};
  for (const [cat, list] of Object.entries(SKILL_VOCAB)) for (const s of list) idx[s] = cat;
  return idx;
})();

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#/.\- ]+/g, ' ').replace(/\s+/g, ' ').trim();

/* Trim punctuation off each token's edges, so "python." and "python" are
   the same token. Inner punctuation survives, keeping "ci/cd" and "node.js"
   intact. */
const trimEdges = (w: string) => w.replace(/^[.\-/+#]+|[.\-/+#]+$/g, '');
const normTokens = (s: string) => norm(s).split(' ').map(trimEdges).filter(Boolean).join(' ');

/* Whole-token containment. Plain `includes` would make the single-letter
   skill "r" match every bullet that merely has the letter r in it. */
const containsTerm = (haystack: string, term: string) =>
  ` ${haystack} `.includes(` ${term} `);

export interface Keyword {
  term: string;
  count: number;
  category: string | null;   // skill category, or null for a generic keyword
  isSkill: boolean;
  weight: number;            // 3 = required skill, 2 = skill, 1 = generic
}

/** Pull the ranked keyword set out of a job description. */
export function extractKeywords(jd: string, limit = 60): Keyword[] {
  if (!jd || !jd.trim()) return [];
  const text = normTokens(jd);

  const counts = new Map<string, number>();
  const bump = (term: string, by = 1) => counts.set(term, (counts.get(term) || 0) + by);

  // Phrases first, then blank them out so their words don't double-count.
  let residual = text;
  for (const p of [...PHRASES, ...Object.values(SKILL_VOCAB).flat()].filter(p => p.includes(' '))) {
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const hits = residual.match(re);
    if (hits) { bump(p, hits.length); residual = residual.replace(re, ' '); }
  }
  for (const w of residual.split(' ')) {
    if (!w || STOP.has(w) || /^\d+$/.test(w)) continue;
    /* One-character tokens are noise unless they are a known skill —
       which is how "R" survives while "a" does not. */
    if (w.length < 2 && !(w in SKILL_INDEX)) continue;
    bump(w);
  }

  /* A term inside a "requirements" / "qualifications" block counts for more —
     that section is what a screener actually filters on. */
  const reqBlock = (() => {
    const start = text.search(/\b(requirements|qualifications|what you.?ll need|you have|must have|basic qualifications)\b/);
    if (start < 0) return '';
    let block = text.slice(start, start + 2500);
    /* Stop at the next section. Without this the block swallows the
       "nice to have" and benefits copy, and everything looks required. */
    const end = block.slice(1).search(
      /\b(nice to have|nice-to-have|bonus|preferred|plus if|we also|benefits|perks|what we offer|about us|equal opportunity)\b/
    );
    if (end >= 0) block = block.slice(0, end + 1);
    return block;
  })();

  const out: Keyword[] = [];
  for (const [term, count] of counts) {
    const cat = SKILL_INDEX[term] || null;
    const isSkill = cat !== null;
    const inReq = containsTerm(reqBlock, term);
    if (!isSkill && count < 2) continue;           // generic words need repetition to earn a slot
    out.push({ term, count, category: cat, isSkill, weight: isSkill ? (inReq ? 3 : 2) : 1 });
  }
  return out
    .sort((a, b) => (b.weight * 10 + b.count) - (a.weight * 10 + a.count))
    .slice(0, limit);
}

export interface BulletMatch {
  bulletId: string;
  text: string;
  hits: string[];
  score: number;
}

export interface MatchReport {
  keywords: Keyword[];
  matched: Keyword[];        // JD keywords your bullets already cover
  missing: Keyword[];        // JD keywords nothing in your library covers
  bullets: BulletMatch[];    // your bullets, ranked by relevance to this JD
  coverage: number;          // 0-100, weighted over skill keywords only
}

/** Score a bullet library against one job description. */
export function matchBullets(
  jd: string,
  bullets: { id: string; text: string }[],
): MatchReport {
  const keywords = extractKeywords(jd);
  const skillKw = keywords.filter(k => k.isSkill);

  const normalized = bullets.map(b => ({ ...b, n: normTokens(b.text) }));

  const bulletMatches: BulletMatch[] = normalized.map(b => {
    const hit = keywords.filter(k => containsTerm(b.n, k.term));
    return {
      bulletId: b.id, text: b.text,
      hits: hit.map(k => k.term),
      score: hit.reduce((sum, k) => sum + k.weight, 0),
    };
  }).filter(b => b.score > 0).sort((a, b) => b.score - a.score);

  const covered = new Set(bulletMatches.flatMap(b => b.hits));
  const matched = keywords.filter(k => covered.has(k.term));
  const missing = keywords.filter(k => !covered.has(k.term) && k.isSkill);

  /* Coverage is measured over skill keywords only. Generic-word coverage
     would inflate the number to something meaningless. */
  const totalW = skillKw.reduce((s, k) => s + k.weight, 0);
  const gotW = skillKw.filter(k => covered.has(k.term)).reduce((s, k) => s + k.weight, 0);
  const coverage = totalW === 0 ? 0 : Math.round((gotW / totalW) * 100);

  return { keywords, matched, missing, bullets: bulletMatches, coverage };
}
