import { type ThemeRegistration } from 'shiki';
import type * as hast_util_to_html_lib_types from 'hast-util-to-html/lib/types';
import type * as hast_types from 'hast';
import { OBSIDIAN_THEME } from 'src/ObsidianTheme';

export class ThemeMapper {
	mapCounter: number;
	mapping: Map<string, string>;

	constructor() {
		this.mapCounter = 0;
		this.mapping = new Map();
	}

	getTheme(): ThemeRegistration {
		return {
			displayName: OBSIDIAN_THEME.displayName,
			name: OBSIDIAN_THEME.name,
			semanticHighlighting: OBSIDIAN_THEME.semanticHighlighting,
			colors: Object.fromEntries(Object.entries(OBSIDIAN_THEME.colors).map(([key, value]) => [key, this.mapColor(value)])),
			tokenColors: OBSIDIAN_THEME.tokenColors.map(token => {
				const newToken = { ...token };

				if (newToken.settings) {
					newToken.settings = { ...newToken.settings };
				}

				if (newToken.settings.foreground) {
					newToken.settings.foreground = this.mapColor(newToken.settings.foreground);
				}

				return newToken;
			}),
		};
	}

	mapColor(color: string): string {
		if (this.mapping.has(color)) {
			return this.mapping.get(color)!;
		} else {
			const newColor = `#${this.mapCounter.toString(16).padStart(6, '0').toUpperCase()}`;
			this.mapCounter += 1;
			this.mapping.set(color, newColor);
			return newColor;
		}
	}

	fixAST(ast: hast_util_to_html_lib_types.Parent): hast_util_to_html_lib_types.Parent {
		ast.children = ast.children.map(child => {
			if (child.type === 'element') {
				return this.fixNode(child);
			} else {
				return child;
			}
		});

		return ast;
	}

	private fixNode(node: hast_types.Element): hast_types.Element {
		if (node.properties?.style) {
			let style = node.properties.style as string;
			for (const [key, value] of this.mapping) {
				style = style.replaceAll(value, key);
			}
			node.properties.style = style;
		}

		for (const child of node.children) {
			if (child.type === 'element') {
				this.fixNode(child);
			}
		}

		return node;
	}
}
