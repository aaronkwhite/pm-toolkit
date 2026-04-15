import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

const CALLOUT_LABELS: Record<CalloutType, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

// Kept for potential future use (e.g. renderHTML title injection)
void CALLOUT_LABELS;

/** Convert > [!TYPE] blockquote syntax to <callout data-type="type"> HTML before Tiptap parse */
export function preprocessCalloutsToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const output: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const match = lines[i].match(/^>\s*\[!([A-Za-z]+)\]\s*(.*)$/);
    if (match) {
      const type = match[1].toLowerCase() as CalloutType;
      const bodyLines: string[] = [];
      const titleExtra = match[2].trim();
      if (titleExtra) bodyLines.push(titleExtra);
      i++;
      while (i < lines.length && /^>/.test(lines[i])) {
        bodyLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const body = bodyLines.join(' ').trim();
      const escaped = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      output.push(`<callout data-type="${type}">${escaped}</callout>`);
    } else {
      output.push(lines[i]);
      i++;
    }
  }
  return output.join('\n');
}

export const CalloutBlock = Node.create({
  name: 'callout',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes() {
    return {
      type: { default: 'note' },
    };
  },
  parseHTML() {
    return [{ tag: 'callout[data-type]', getAttrs: el => ({ type: (el as HTMLElement).dataset.type ?? 'note' }) }];
  },
  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes.type as CalloutType;
    return [
      'div',
      mergeAttributes({ 'data-type': type, class: `pm-callout pm-callout-${type}` }),
      0,
    ];
  },
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const type = (node.attrs.type as string).toUpperCase();
          state.write(`> [!${type}]`);
          state.ensureNewLine();
          state.write('> ');
          state.renderInline(node);
          state.ensureNewLine();
          state.closeBlock(node);
        },
        parse: {
          updateDOM(_element: HTMLElement) {
            // handled by preprocessCalloutsToHtml
          },
        },
      },
    };
  },
});
