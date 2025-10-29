/**
 * TypeScript interfaces for Notion API payloads
 * Eliminates 'as any' casts throughout the codebase
 */

// Base property types
export interface NotionRichTextProperty {
  rich_text: Array<{
    type: 'text';
    text: {
      content: string;
      link?: { url: string } | null;
    };
    plain_text?: string;
    href?: string | null;
  }>;
}

export interface NotionTitleProperty {
  title: Array<{
    type: 'text';
    text: {
      content: string;
    };
    plain_text?: string;
  }>;
}

export interface NotionNumberProperty {
  number: number | null;
}

export interface NotionSelectProperty {
  select: {
    id?: string;
    name: string;
    color?: string;
  } | null;
}

export interface NotionDateProperty {
  date: {
    start: string;
    end?: string | null;
    time_zone?: string | null;
  } | null;
}

export interface NotionCheckboxProperty {
  checkbox: boolean;
}

export interface NotionUrlProperty {
  url: string | null;
}

export interface NotionFilesProperty {
  files: Array<{
    name: string;
    type?: 'file' | 'external';
    file?: { url: string; expiry_time: string };
    external?: { url: string };
  }>;
}

// Page object
export interface NotionPage {
  object: 'page';
  id: string;
  created_time: string;
  last_edited_time: string;
  archived: boolean;
  properties: Record<string, NotionProperty>;
  parent: {
    type: 'database_id' | 'page_id' | 'workspace';
    database_id?: string;
    page_id?: string;
  };
  url: string;
}

// Union type for all property types
export type NotionProperty =
  | NotionRichTextProperty
  | NotionTitleProperty
  | NotionNumberProperty
  | NotionSelectProperty
  | NotionDateProperty
  | NotionCheckboxProperty
  | NotionUrlProperty
  | NotionFilesProperty;

// Database query response
export interface NotionDatabaseQueryResponse {
  object: 'list';
  results: NotionPage[];
  next_cursor: string | null;
  has_more: boolean;
}

// Page create/update request
export interface NotionPageCreateRequest {
  parent: {
    database_id: string;
  };
  properties: Record<string, Partial<NotionProperty>>;
}

export interface NotionPageUpdateRequest {
  page_id: string;
  properties: Record<string, Partial<NotionProperty>>;
  archived?: boolean;
}

// Database query request
export interface NotionDatabaseQueryRequest {
  database_id: string;
  filter?: NotionFilter;
  sorts?: NotionSort[];
  page_size?: number;
  start_cursor?: string;
}

// Filter types
export type NotionFilter =
  | NotionPropertyFilter
  | NotionCompoundFilter;

export interface NotionPropertyFilter {
  property: string;
  rich_text?: NotionTextFilterCondition;
  number?: NotionNumberFilterCondition;
  checkbox?: NotionCheckboxFilterCondition;
  select?: NotionSelectFilterCondition;
  date?: NotionDateFilterCondition;
}

export interface NotionCompoundFilter {
  and?: NotionFilter[];
  or?: NotionFilter[];
}

export interface NotionTextFilterCondition {
  equals?: string;
  does_not_equal?: string;
  contains?: string;
  does_not_contain?: string;
  starts_with?: string;
  ends_with?: string;
  is_empty?: boolean;
  is_not_empty?: boolean;
}

export interface NotionNumberFilterCondition {
  equals?: number;
  does_not_equal?: number;
  greater_than?: number;
  less_than?: number;
  greater_than_or_equal_to?: number;
  less_than_or_equal_to?: number;
  is_empty?: boolean;
  is_not_empty?: boolean;
}

export interface NotionCheckboxFilterCondition {
  equals?: boolean;
  does_not_equal?: boolean;
}

export interface NotionSelectFilterCondition {
  equals?: string;
  does_not_equal?: string;
  is_empty?: boolean;
  is_not_empty?: boolean;
}

export interface NotionDateFilterCondition {
  equals?: string;
  before?: string;
  after?: string;
  on_or_before?: string;
  on_or_after?: string;
  is_empty?: boolean;
  is_not_empty?: boolean;
  past_week?: Record<string, never>;
  past_month?: Record<string, never>;
  past_year?: Record<string, never>;
  next_week?: Record<string, never>;
  next_month?: Record<string, never>;
  next_year?: Record<string, never>;
}

// Sort types
export type NotionSort =
  | { property: string; direction: 'ascending' | 'descending' }
  | { timestamp: 'created_time' | 'last_edited_time'; direction: 'ascending' | 'descending' };

// Database retrieve response
export interface NotionDatabase {
  object: 'database';
  id: string;
  created_time: string;
  last_edited_time: string;
  title: Array<{
    type: 'text';
    text: { content: string };
    plain_text: string;
  }>;
  properties: Record<string, NotionDatabaseProperty>;
  parent: {
    type: 'page_id' | 'workspace';
    page_id?: string;
  };
  url: string;
  archived: boolean;
}

// Database property configuration
export type NotionDatabaseProperty =
  | { type: 'rich_text'; rich_text: Record<string, never> }
  | { type: 'title'; title: Record<string, never> }
  | { type: 'number'; number: { format: string } }
  | { type: 'select'; select: { options: Array<{ name: string; color: string }> } }
  | { type: 'date'; date: Record<string, never> }
  | { type: 'checkbox'; checkbox: Record<string, never> }
  | { type: 'url'; url: Record<string, never> }
  | { type: 'files'; files: Record<string, never> };

// Database update request
export interface NotionDatabaseUpdateRequest {
  database_id: string;
  properties?: Record<string, NotionDatabaseProperty>;
  title?: Array<{
    type: 'text';
    text: { content: string };
  }>;
}

