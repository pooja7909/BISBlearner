import { FORMAT_META, yearLabel, type ClassroomActivity } from '../types.ts';

/*
 * Paper back-up for any activity: opens a print-ready worksheet in a new tab
 * (pupil page(s) first, then a teacher answer sheet on its own page).
 * Use it when the wifi, projector or pupil devices let you down.
 */

function esc(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shuffled<T>(items: T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function choiceQuestions(
  questions: { prompt: string; options: string[]; correctIndex: number; explanation?: string }[]
): { pupil: string; answers: string } {
  const pupil = questions
    .map(
      (q, i) => `<li class="q"><p>${esc(q.prompt)}</p><ul class="opts">${q.options
        .map((o, k) => `<li><span class="box"></span> ${LETTERS[k]}. ${esc(o)}</li>`)
        .join('')}</ul></li>`
    )
    .join('');
  const answers = questions
    .map(
      (q, i) =>
        `<li><b>${LETTERS[q.correctIndex] ?? '?'}</b>: ${esc(q.options[q.correctIndex] ?? '')}${
          q.explanation ? ` <span class="why">${esc(q.explanation)}</span>` : ''
        }</li>`
    )
    .join('');
  return { pupil: `<ol class="qs">${pupil}</ol>`, answers: `<ol>${answers}</ol>` };
}

function buildBody(activity: ClassroomActivity): { pupil: string; answers: string } {
  const p = activity.payload;
  switch (p.type) {
    case 'quiz':
      return choiceQuestions(
        p.questions.map((q) => ({
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        }))
      );

    case 'buzzer': {
      const all = p.categories.flatMap((c) =>
        c.questions.map((q) => ({ ...q, prompt: `${c.name} (${q.points} points): ${q.prompt}` }))
      );
      return choiceQuestions(all);
    }

    case 'escape': {
      const intro = p.storyIntro ? `<p class="story">${esc(p.storyIntro)}</p>` : '';
      const qs = choiceQuestions(
        p.stages.map((s) => ({
          prompt: `${s.stageTitle}: ${s.riddle}`,
          options: s.options,
          correctIndex: s.correctIndex,
          explanation: s.explanation,
        }))
      );
      const codeBoxes = `<p class="code">Secret code: ${p.stages.map(() => '<span class="digit"></span>').join('')}</p>`;
      return {
        pupil: intro + qs.pupil + codeBoxes,
        answers: qs.answers + `<p>Code: <b>${p.stages.map((s) => esc(s.codeDigit)).join(' ')}</b></p>`,
      };
    }

    case 'sort': {
      const items = shuffled(p.items);
      const pupil = `
        <p class="hint">Write each word or phrase in the right column.</p>
        <div class="wordbank">${items.map((it) => `<span>${esc(it.text)}</span>`).join('')}</div>
        <table class="sort"><tr>${p.buckets.map((b) => `<th>${esc(b.label)}</th>`).join('')}</tr>
        <tr>${p.buckets.map(() => `<td></td>`).join('')}</tr></table>`;
      const answers = p.buckets
        .map(
          (b) =>
            `<p><b>${esc(b.label)}:</b> ${p.items
              .filter((it) => it.bucketId === b.id)
              .map((it) => esc(it.text))
              .join(', ')}</p>`
        )
        .join('');
      return { pupil, answers };
    }

    case 'sequence': {
      const steps = shuffled(p.steps);
      const pupil = `<p class="hint">Number the boxes 1 to ${steps.length} to show the right order.</p>
        <ul class="seq">${steps
          .map((s) => `<li><span class="numbox"></span><div><b>${esc(s.label)}</b>${s.detail ? `<br>${esc(s.detail)}` : ''}</div></li>`)
          .join('')}</ul>`;
      const answers = `<ol>${[...p.steps]
        .sort((a, b) => a.order - b.order)
        .map((s) => `<li>${esc(s.label)}</li>`)
        .join('')}</ol>`;
      return { pupil, answers };
    }

    case 'match': {
      const rights = shuffled(p.pairs.map((pair, i) => ({ text: pair.right, i })));
      const pupil = `<p class="hint">Write the letter of the matching answer next to each number.</p>
        <div class="match"><div><h3>${esc(p.leftHeading || 'Words')}</h3><ol>${p.pairs
          .map((pair) => `<li>${esc(pair.left)} <span class="line">____</span></li>`)
          .join('')}</ol></div>
        <div><h3>${esc(p.rightHeading || 'Meanings')}</h3><ul class="lettered">${rights
          .map((r, k) => `<li><b>${LETTERS[k]}.</b> ${esc(r.text)}</li>`)
          .join('')}</ul></div></div>`;
      const answers = `<ol>${p.pairs
        .map((pair, i) => {
          const k = rights.findIndex((r) => r.i === i);
          return `<li><b>${LETTERS[k]}</b>: ${esc(pair.right)}</li>`;
        })
        .join('')}</ol>`;
      return { pupil, answers };
    }

    case 'cloze': {
      const answersList: string[] = [];
      const passage = p.segments
        .map((seg) => {
          if (seg.blankId || seg.answer) {
            answersList.push(String(seg.answer ?? ''));
            return ` <span class="gap">(${answersList.length})</span> `;
          }
          return esc(seg.text ?? '');
        })
        .join('');
      const bank = shuffled([...answersList, ...(p.distractors || [])]);
      return {
        pupil: `<p class="hint">Fill each gap with a word from the box. Some words are not needed.</p>
          <div class="wordbank">${bank.map((w) => `<span>${esc(w)}</span>`).join('')}</div>
          <p class="passage">${passage}</p>`,
        answers: `<ol>${answersList.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>`,
      };
    }

    case 'bingo': {
      const cards = [0, 1, 2, 3].map(() => shuffled(p.entries).slice(0, 9));
      const pupil = `<p class="hint">Cut out the cards. The teacher reads a clue; cross out the matching word.</p>
        <div class="bingo-cards">${cards
          .map(
            (card) =>
              `<table class="bingo"><caption>Bingo</caption>${[0, 1, 2]
                .map((r) => `<tr>${card.slice(r * 3, r * 3 + 3).map((e) => `<td>${esc(e.term)}</td>`).join('')}</tr>`)
                .join('')}</table>`
          )
          .join('')}</div>`;
      const answers = `<p>Read these clues aloud in any order:</p><ol>${p.entries
        .map((e) => `<li>${esc(e.clue)} <b>→ ${esc(e.term)}</b></li>`)
        .join('')}</ol>`;
      return { pupil, answers };
    }

    case 'draw':
      return {
        pupil: `<p class="task">${esc(p.prompt)}</p>
          ${p.labelChips?.length ? `<p class="hint">Use these labels:</p><div class="wordbank">${p.labelChips.map((l) => `<span>${esc(l)}</span>`).join('')}</div>` : ''}
          <div class="drawbox"></div>
          ${p.checklist?.length ? `<p class="hint">Check your drawing has:</p><ul class="check">${p.checklist.map((c) => `<li><span class="box"></span> ${esc(c)}</li>`).join('')}</ul>` : ''}`,
        answers: p.checklist?.length ? `<ul>${p.checklist.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : '<p>Use the checklist on the pupil page.</p>',
      };

    case 'wordcloud':
      return {
        pupil: `<p class="task">${esc(p.prompt)}</p>
          <p class="hint">Write as many words as you can.</p>
          <div class="lines">${'<div></div>'.repeat(8)}</div>
          ${p.followUpQuestion ? `<p class="task">${esc(p.followUpQuestion)}</p><div class="lines">${'<div></div>'.repeat(4)}</div>` : ''}`,
        answers: p.seedWords?.length ? `<p>Example words: ${p.seedWords.map(esc).join(', ')}</p>` : '<p>Any sensible words.</p>',
      };
  }
}

const STYLES = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13pt; line-height: 1.45; color: #111; margin: 0; }
  header { border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 12px; }
  h1 { font-size: 20pt; margin: 0 0 4px; }
  h2 { font-size: 15pt; margin: 0 0 8px; }
  .meta { font-size: 10pt; color: #444; }
  .name { display: flex; gap: 24px; margin: 8px 0 4px; font-size: 12pt; }
  .name span { flex: 1; border-bottom: 1px solid #111; padding-bottom: 2px; }
  .objs { font-size: 11pt; margin: 6px 0 12px; padding-left: 18px; }
  .hint { font-style: italic; margin: 6px 0; }
  .task { font-weight: bold; font-size: 14pt; }
  .qs > li { margin-bottom: 12px; break-inside: avoid; }
  .qs p { margin: 0 0 4px; font-weight: bold; }
  .opts { list-style: none; padding-left: 4px; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 18px; }
  .box, .numbox { display: inline-block; width: 15px; height: 15px; border: 1.5px solid #111; vertical-align: -2px; }
  .numbox { width: 30px; height: 30px; flex: 0 0 auto; }
  .seq { list-style: none; padding: 0; }
  .seq li { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 10px; break-inside: avoid; }
  .wordbank { border: 1.5px solid #111; padding: 8px; display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 8px 0 12px; }
  table.sort { width: 100%; border-collapse: collapse; }
  table.sort th, table.sort td { border: 1.5px solid #111; padding: 6px; vertical-align: top; }
  table.sort td { height: 330px; }
  .match { display: grid; grid-template-columns: 1fr 1.3fr; gap: 20px; }
  .match h3 { font-size: 12pt; margin: 0 0 4px; }
  .match li { margin-bottom: 8px; }
  .lettered { list-style: none; padding-left: 0; }
  .line { letter-spacing: 2px; }
  .passage { line-height: 2.2; }
  .gap { display: inline-block; min-width: 90px; border-bottom: 1.5px solid #111; text-align: left; font-size: 9pt; color: #555; }
  .bingo-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  table.bingo { width: 100%; border-collapse: collapse; break-inside: avoid; }
  table.bingo caption { font-weight: bold; margin-bottom: 4px; }
  table.bingo td { border: 2px solid #111; height: 70px; text-align: center; padding: 4px; font-size: 11pt; }
  .drawbox { border: 2px solid #111; height: 420px; margin: 10px 0; }
  .check { list-style: none; padding-left: 0; }
  .lines div { border-bottom: 1px solid #777; height: 30px; }
  .story { border-left: 4px solid #111; padding-left: 10px; }
  .code { font-size: 14pt; font-weight: bold; margin-top: 12px; }
  .digit { display: inline-block; width: 36px; height: 42px; border: 2px solid #111; margin-left: 6px; vertical-align: middle; }
  .answers { break-before: page; }
  .answers .why { color: #444; font-size: 11pt; }
  .tip { font-size: 11pt; border: 1px dashed #777; padding: 8px; margin-top: 12px; }
  .noprint { position: sticky; top: 0; background: #fffbe6; border-bottom: 1px solid #e5c100; padding: 10px; font-family: Arial; display: flex; gap: 12px; align-items: center; }
  .noprint button { font-size: 14pt; padding: 8px 18px; border-radius: 8px; border: 0; background: #1d4ed8; color: #fff; cursor: pointer; }
  @media print { .noprint { display: none; } }
`;

export function buildWorksheetHtml(activity: ClassroomActivity): string {
  const { pupil, answers } = buildBody(activity);
  const fmt = FORMAT_META[activity.format].label;
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8">
<title>${esc(activity.title)} – worksheet</title><style>${STYLES}</style></head><body>
<div class="noprint"><button onclick="window.print()">Print this worksheet</button>
<span>Pupil page first, then a teacher answer sheet on a separate page.</span></div>
<main style="padding: 0 4px;">
<header>
  <h1>${esc(activity.title)}</h1>
  <div class="meta">${esc(yearLabel(activity))} · ${esc(activity.subject)} · ${esc(fmt)}</div>
  <div class="name"><span>Name:</span><span>Date:</span></div>
</header>
${activity.objectives.length ? `<div class="meta"><b>We are learning to:</b></div><ul class="objs">${activity.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
${'instructions' in activity.payload && activity.payload.instructions ? `<p class="hint">${esc(activity.payload.instructions)}</p>` : ''}
${pupil}
<section class="answers">
  <h2>Answer sheet (teacher): ${esc(activity.title)}</h2>
  ${answers}
  ${activity.teacherTip ? `<p class="tip"><b>Teaching tip:</b> ${esc(activity.teacherTip)}</p>` : ''}
</section>
</main></body></html>`;
}

/** Opens the worksheet in a new tab with a big Print button. Returns false if a pop-up blocker stopped it. */
export function openWorksheet(activity: ClassroomActivity): boolean {
  const html = buildWorksheetHtml(activity);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return Boolean(win);
}
