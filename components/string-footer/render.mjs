import { readFileSync } from 'node:fs';
const full = readFileSync(new URL('./footer.html', import.meta.url), 'utf8');
const compact = readFileSync(new URL('./compact.html', import.meta.url), 'utf8');
const github = full.match(/<a href="https:\/\/github\.com\/String-sg\/"[^>]*>.*?<\/a>/s)?.[0];
if (!github) throw new Error('Shared GitHub icon missing');
export const escapeHtml = value => String(value).replace(/[&<>"'{}]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','{':'&#123;','}':'&#125;'}[c]));
export function creditMarkup(credits = []) {
  if (!Array.isArray(credits)) throw new Error('credits must be an array');
  return credits.map(credit => {
    if (!credit || typeof credit.name !== 'string' || !credit.name.trim()) throw new Error('Every credit needs a contributor name');
    const label = credit.label ?? 'Created by';
    if (typeof label !== 'string' || !label.trim()) throw new Error('Credit label must be non-empty text');
    const name = `<strong>${escapeHtml(credit.name)}</strong>`;
    let linkedName = name;
    if (credit.url !== undefined) {
      const url = new URL(credit.url);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Credit URLs must use HTTPS without credentials');
      linkedName = `<a href="${escapeHtml(url.href)}">${name}</a>`;
    }
    return `${escapeHtml(label)} ${linkedName}`;
  }).join(' · ');
}
export function renderFooter({ variant = 'full', credits = [], product, support = 'Part of', supportNewTab = false } = {}) {
  if (!['full','compact'].includes(variant)) throw new Error('variant must be full or compact');
  const authors = creditMarkup(credits);
  if (variant === 'compact' && !authors) throw new Error('Compact footer requires visible contributor credits');
  if (typeof support !== 'string' || !support.trim()) throw new Error('support must be non-empty text');
  const conduct = product === 'id' ? '<a href="/conduct">Code of Conduct</a>' : '';
  const target = supportNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
  const attribution = `${authors}, ${escapeHtml(support)} <a href="https://string.sg"${target}>string.sg</a>`;
  return (variant === 'full' ? full : compact)
    .replace('{{attribution}}', attribution)
    .replace('{{credits}}', authors ? `<div class="str-footer__credit-extra"><p class="str-footer__credits">${authors}</p></div>` : '')
    .replace('{{github}}', github)
    .replace('{{conduct}}', conduct)
    .replace(/[ \t]+$/gm, '');
}
