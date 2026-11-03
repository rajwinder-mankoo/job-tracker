// Status classification shared by the browser UI and the test suite.
// Exact, case-insensitive matches only: substring matching would treat "Not applied" as applied.
export const appliedStatuses = ['Applied', 'Interview', 'Offer', 'Accepted', 'Rejected', 'Withdrawn'];
const applied = new Set(appliedStatuses.map(s => s.toLowerCase()));
const normalize = status => String(status ?? '').trim().toLowerCase();

export const hasApplied = job => Boolean(String(job.applied ?? '').trim()) || applied.has(normalize(job.status));
