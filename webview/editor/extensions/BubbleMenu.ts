/**
 * Bubble Menu Extension
 *
 * Tiptap extension that shows a floating toolbar when text is selected.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { BubbleMenu } from '../components/BubbleMenu';

export const BubbleMenuPluginKey = new PluginKey('bubbleMenu');

export const BubbleMenuExtension = Extension.create({
  name: 'bubbleMenu',

  addProseMirrorPlugins() {
    const editor = this.editor;
    let menu: BubbleMenu | null = null;

    return [
      new Plugin({
        key: BubbleMenuPluginKey,
        view() {
          menu = new BubbleMenu(editor);

          return {
            update: () => {
              menu?.update();
            },
            destroy: () => {
              menu?.destroy();
              menu = null;
            },
          };
        },
      }),
    ];
  },
});
