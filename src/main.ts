import { Plugin } from 'obsidian';
import { bundledLanguages, getHighlighter } from 'shiki';
import { OBSIDIAN_THEME } from 'src/ObsidianTheme';
import { ExpressiveCodeEngine, ExpressiveCodeTheme } from '@expressive-code/core';
import { pluginShiki } from '@expressive-code/plugin-shiki';
import { toHtml } from 'hast-util-to-html';

// some languages break obsidian's `registerMarkdownCodeBlockProcessor`, so we blacklist them
const languageNameBlacklist = new Set(['c++', 'c#', 'f#']);

export default class ShikiPlugin extends Plugin {
	async onload(): Promise<void> {
		// const highlighter = await getHighlighter({
		// 	themes: [OBSIDIAN_THEME],
		// 	langs: Object.keys(bundledLanguages),
		// });

		const registeredLanguages = new Set<string>();

		const ec = new ExpressiveCodeEngine({
			themes: [new ExpressiveCodeTheme(OBSIDIAN_THEME as any)],
			plugins: [
				pluginShiki({
					langs: Object.entries(bundledLanguages).map(([_, langFn]) => langFn),
				}),
			],
		});

		console.log(ec);

		for (const [shikiLanguage, registration] of Object.entries(bundledLanguages)) {
			// the last element of the array is seemingly the most recent version of the language
			const language = (await registration()).default.at(-1);

			if (language === undefined) {
				continue;
			}

			// get the language name and the aliases
			const languageAliases = [language.name];
			if (language.aliases !== undefined) {
				languageAliases.push(...language.aliases);
			}

			for (const languageAlias of languageAliases) {
				// if we already registered this language, or it's in the blacklist, skip it
				if (registeredLanguages.has(languageAlias) || languageNameBlacklist.has(languageAlias)) {
					continue;
				}

				registeredLanguages.add(languageAlias);

				// register the language with obsidian
				this.registerMarkdownCodeBlockProcessor(languageAlias, async (source, el, ctx) => {
					// yes, this is innerHTML, but we trust shiki
					// and this is how shiki recommends using it
					// https://shiki.style/guide/install#shorthands
					// this is also async, against what eslint thinks
					// eslint-disable-next-line @typescript-eslint/await-thenable
					// el.innerHTML = await highlighter.codeToHtml(source, {
					// 	lang: shikiLanguage,
					// 	theme: 'obsidian-theme',
					// 	meta: {
					// 		__raw: '',
					// 	},
					// });

					const rederResult = await ec.render({
						code: source,
						language: language.name,
					});

					el.innerHTML = toHtml(rederResult.renderedGroupAst);
				});
			}
		}
	}

	onunload(): void {}
}
