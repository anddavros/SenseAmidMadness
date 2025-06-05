/**********************************************************************
 * Safe-TOC – hardened replacement for the original Table-of-Contents
 * Obsidian plugin (2025-06-05)
 *********************************************************************/

import {
  Plugin,
  PluginSettingTab,
  Setting,
  Notice,
  MarkdownView,
  TFile,
  requestUrl,
} from 'obsidian';
import anchorMarkdownHeader from 'anchor-markdown-header';

// -------------------------------------------------------------------
//  Shared helpers
// -------------------------------------------------------------------

// One-time compiled emoji regexp from the original source
const EMOJI_RX = /(#[*0-9]\uFE0F?\u20E3|[\u00A9\u00AE\u203C-\u3299\uE50A])/g;

// Escape &, <, >, ", ', `
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

function sanitizeLabel(raw: string): string {
  return raw
    .replace(/[\u200B-\u200D\uFEFF]/g, '')    // strip zero-width
    .replace(/[&<>"'`]/g, ch => HTML_ENTITIES[ch]);
}

function safeSlug(raw: string): string {
  return encodeURI(
    raw
      .normalize('NFC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\.\.+/g, '')   // remove ..
      .replace(/[\/\\]/g, '')  // remove path separators
  );
}

// -------------------------------------------------------------------
//  Settings
// -------------------------------------------------------------------

interface TocSettings {
  minimumDepth: number;
  maximumDepth: number;
  listStyle: 'bullet' | 'number';
  useMarkdown: boolean;
  githubCompat: boolean;
  title?: string;
  maxHeadings: number;
}

const DEFAULTS: TocSettings = {
  minimumDepth: 2,
  maximumDepth: 6,
  listStyle: 'bullet',
  useMarkdown: false,
  githubCompat: false,
  maxHeadings: 1000,          // ❶ freeze-guard
};

export default class SafeTocPlugin extends Plugin {
  settings!: TocSettings;

  async onload(): Promise<void> {
    console.log('[Safe-TOC] loading');
    this.settings = Object.assign({}, DEFAULTS, await this.loadSettings());

    this.addCommand({
      id: 'create-safe-toc',
      name: 'Create Table of Contents',
      callback: () => this.createTocForActiveFile(),
    });

    this.addSettingTab(new SafeTocSettingTab(this.app, this));
  }

  // -----------------------------------------------------------------
  //  Core: build & insert
  // -----------------------------------------------------------------
  private createTocForActiveFile(): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;

    const editor = view.sourceMode.cmEditor;
    const cursor = editor.getCursor();
    const cache = this.app.metadataCache.getFileCache(
      view.file as TFile,
    ) ?? {};

    this.buildToc(cache, cursor).then(toc => {
      if (toc) editor.replaceRange(toc, cursor);
    });
  }

  private async buildToc(cache: any, startPos: any): Promise<string | null> {
    const headings = cache.headings ?? [];
    const toc: string[] = [];

    // Determine parent heading depth
    const parentDepth = headings
      .filter((h: any) => h.position.end.line < startPos.line)
      .pop()?.level ?? 0;

    const usable = headings.filter(
      (h: any) =>
        h.position.end.line > startPos.line &&
        h.level > parentDepth &&
        h.level >= this.settings.minimumDepth &&
        h.level <= this.settings.maximumDepth,
    );

    if (!usable.length) {
      new Notice(
        `No headings below cursor matched settings (min ${this.settings.minimumDepth} / max ${this.settings.maximumDepth})`,
      );
      return null;
    }

    if (usable.length > this.settings.maxHeadings) {
      new Notice(
        `Aborting TOC build – more than ${this.settings.maxHeadings} headings`,
      );
      return null;
    }

    const firstDepth = usable[0].level;
    let processed = 0;

    const processChunk = (resolve: (v: string) => void) => {
      const CHUNK_SIZE = 250;          // yield back to UI every N headings
      const slice = usable.slice(processed, processed + CHUNK_SIZE);

      slice.forEach((h: any) => {
        const indent = '\t'.repeat(Math.max(0, h.level - firstDepth));
        const bullet =
          this.settings.listStyle === 'number' ? '1.' : '-';

        const label = sanitizeLabel(h.heading);
        let anchor = safeSlug(h.heading);

        if (this.settings.useMarkdown && this.settings.githubCompat) {
          // GitHub-style compatibility
          anchor = anchorMarkdownHeader(h.heading, 'github.com');
        }

        const linkText = this.settings.useMarkdown
          ? `[${label}](#${anchor})`
          : `[[#${anchor}|${label}]]`;

        toc.push(`${indent}${bullet} ${linkText}`);
      });

      processed += slice.length;

      if (processed < usable.length) {
        requestIdleCallback(() => processChunk(resolve));
      } else {
        // prepend title if configured
        const header = this.settings.title ? `${this.settings.title}\n` : '';
        resolve(`${header}${toc.join('\n')}\n`);
      }
    };

    return new Promise<string>(res => processChunk(res));
  }

  // -----------------------------------------------------------------
  //  Persistence
  // -----------------------------------------------------------------
  private async loadSettings(): Promise<Partial<TocSettings>> {
    const raw = await this.loadData();
    return JSON.parse(JSON.stringify(raw ?? {})); // deep clone
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

// -------------------------------------------------------------------
//  Settings UI (unchanged except for new maxHeadings slider)
// -------------------------------------------------------------------

class SafeTocSettingTab extends PluginSettingTab {
  constructor(private pluginApp: any, private plugin: SafeTocPlugin) {
    super(pluginApp, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Table of Contents – Safe Settings' });

    new Setting(containerEl)
      .setName('List style')
      .addDropdown(d =>
        d
          .addOption('bullet', 'Bullet')
          .addOption('number', 'Number')
          .setValue(this.plugin.settings.listStyle)
          .onChange(async v => {
            this.plugin.settings.listStyle = v as 'bullet' | 'number';
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Minimum heading depth')
      .addSlider(s =>
        s
          .setLimits(1, 6, 1)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.minimumDepth)
          .onChange(async v => {
            this.plugin.settings.minimumDepth = v;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Maximum heading depth')
      .addSlider(s =>
        s
          .setLimits(1, 6, 1)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.maximumDepth)
          .onChange(async v => {
            this.plugin.settings.maximumDepth = v;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Use Markdown links instead of WikiLinks')
      .addToggle(t =>
        t
          .setValue(this.plugin.settings.useMarkdown)
          .onChange(async v => {
            this.plugin.settings.useMarkdown = v;
            await this.plugin.saveSettings();
            this.display();
          }),
      );

    if (this.plugin.settings.useMarkdown) {
      new Setting(containerEl)
        .setName('GitHub-compatible anchors')
        .addToggle(t =>
          t
            .setValue(this.plugin.settings.githubCompat)
            .onChange(async v => {
              this.plugin.settings.githubCompat = v;
              await this.plugin.saveSettings();
            }),
        );
    }

    new Setting(containerEl)
      .setName('Abort if headings exceed …')
      .setDesc('Prevents UI freezes on giant notes')
      .addSlider(s =>
        s
          .setLimits(100, 5000, 100)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.maxHeadings)
          .onChange(async v => {
            this.plugin.settings.maxHeadings = v;
            await this.plugin.saveSettings();
          }),
      );
  }
}