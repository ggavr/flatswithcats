/**
 * Common utilities for parsing and building Notion properties
 */

export const text = (value?: string | null) => {
  if (!value) return [];
  return [{ type: 'text', text: { content: value.toString().slice(0, 1900) } }];
};

export const parseRichText = (prop: any): string => {
  return prop?.rich_text?.[0]?.plain_text ?? '';
};

export const parseNumber = (prop: any): number | undefined => {
  return typeof prop?.number === 'number' ? prop.number : undefined;
};

export const parseTitle = (prop: any): string => {
  return prop?.title?.[0]?.plain_text ?? '';
};

/**
 * Build a standardized Notion property object for rich text
 */
export const buildRichTextProperty = (value: string | undefined | null) => ({
  rich_text: text(value)
});

/**
 * Build a standardized Notion property object for numbers
 */
export const buildNumberProperty = (value: number | undefined | null) => ({
  number: value ?? null
});

/**
 * Build a standardized Notion property object for title
 */
export const buildTitleProperty = (value: string | undefined | null) => ({
  title: text(value)
});

