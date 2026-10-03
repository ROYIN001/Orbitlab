import { t } from '../../i18n';
import { packReviewStatus, type HumanReview, type PackReview } from '../../lessons/review';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
};

/** All labels are rebuilt with the catalogue when the interface language changes. */
export function renderPackReview(review: PackReview): HTMLElement {
  const box = el('div');
  box.className = 'lesson-review';
  box.dataset.review = packReviewStatus(review);
  const objective = el('p');
  objective.append(el('strong', `${t('lesson.review.objective')}: `), document.createTextNode(t(review.objectiveKey)));
  box.append(objective);
  const duration = el('p', review.duration
    ? `${t('lesson.review.durationEstimate', { minutes: review.duration.minutes })}. ${t(review.duration.methodKey)}`
    : t('lesson.review.durationUnknown'));
  duration.className = 'lesson-review-duration';
  box.append(duration);
  const details = el('details');
  details.append(el('summary', `${t(`lesson.review.${packReviewStatus(review)}`)} · ${t('lesson.review.details')}`));
  const statuses = el('dl');
  const row = (label: string, result: HumanReview): void => {
    statuses.append(el('dt', label), el('dd', result.status === 'pending' ? t('lesson.review.status.pending')
      : t('lesson.review.status.reviewed', { reviewer: result.reviewer, date: result.date })));
  };
  row(t('lesson.review.owner'), review.owner);
  row(t('lesson.review.teacher'), review.teacher);
  for (const language of ['en', 'ru', 'th'] as const) {
    row(t('lesson.review.language', { language: t(`lesson.review.language.${language}`) }), review.language[language]);
  }
  details.append(statuses, el('p', t('lesson.review.automated')), el('strong', t('lesson.review.sources')));
  const sources = el('ul');
  for (const source of review.sources) {
    const item = el('li');
    const link = el('a', t(source.titleKey));
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    item.append(link);
    if (source.locator) item.append(document.createTextNode(` — ${t(`lesson.review.${source.locator.kind}`, { value: source.locator.value })}`));
    sources.append(item);
  }
  details.append(sources, el('p', t('lesson.review.sourceNote')));
  box.append(details);
  return box;
}
