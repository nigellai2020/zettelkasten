export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  links: string[]; // IDs of linked notes
  dirty?: boolean; // true if local changes not yet synced
  deleted?: boolean; // true if note is deleted (tombstone)
}

export interface SearchResult {
  note: Note;
  matches: {
    field: 'title' | 'content' | 'tags';
    text: string;
    index: number;
    length?: number;
    score?: number;
  }[];
  totalScore: number;
}

export interface GraphNode {
  id: string;
  title: string;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string;
  target: string;
}