import { Note, SearchResult } from '../types';

export const extractLinks = (content: string): string[] => {
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const matches = [];
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    matches.push(match[1].trim());
  }
  
  return [...new Set(matches)]; // Remove duplicates
};

export const extractTags = (content: string): string[] => {
  const tagRegex = /#([a-zA-Z0-9_-]+)/g;
  const matches = [];
  let match;
  
  while ((match = tagRegex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  
  return [...new Set(matches)];
};

export const renderContentWithLinks = (content: string, notes: Note[]): string => {
  const noteMap = new Map(notes.map(note => [note.title.toLowerCase(), note.id]));
  
  return content.replace(/\[\[([^\]]+)\]\]/g, (match, linkText) => {
    const noteId = noteMap.get(linkText.toLowerCase());
    if (noteId) {
      return `<span class="note-link cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors" data-note-id="${noteId}">${linkText}</span>`;
    }
    return `<span class="note-link-broken text-gray-500 dark:text-dark-500">${linkText}</span>`;
  });
};

export const getBacklinks = (noteId: string, notes: Note[]): Note[] => {
  return notes.filter(note => 
    note.id !== noteId && note.links.includes(noteId)
  );
};

export const searchNotes = (
  query: string, 
  notes: Note[], 
  searchMode: 'all' | 'title' | 'content' | 'tags' = 'all'
): SearchResult[] => {
  if (!query.trim()) return [];
  
  const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results: SearchResult[] = [];
  
  for (const note of notes) {
    const matches: SearchResult['matches'] = [];
    let totalScore = 0;
    
    // Helper function to calculate match score
    const calculateScore = (text: string, field: 'title' | 'content' | 'tags', multiplier: number = 1) => {
      const lowerText = text.toLowerCase();
      let fieldScore = 0;
      let matchedWords = new Set<string>();
         
      queryWords.forEach(word => {
        if (lowerText.includes(word)) {
          matchedWords.add(word);
          // Exact word match gets higher score
          const exactWordRegex = new RegExp(`\\b${word}\\b`, 'i');
          const isExactWord = exactWordRegex.test(text);
          const wordScore = isExactWord ? word.length * 2 : word.length;
          fieldScore += wordScore;
          
          // Find all occurrences for highlighting
          let index = lowerText.indexOf(word);
          while (index !== -1) {
            matches.push({
              field,
              text: text,
              index,
              length: word.length,
              score: wordScore
            });
            index = lowerText.indexOf(word, index + 1);
          }
        }
      });
      
      // Only return score if ALL meaningful query words are matched
      const hasAllMatches = matchedWords.size === queryWords.length && queryWords.length > 0;
      return hasAllMatches ? fieldScore * multiplier : 0;
    };
    
    // Search based on mode
    if (searchMode === 'all' || searchMode === 'title') {
      totalScore += calculateScore(note.title, 'title', 3); // Title matches are most important
    }
    
    if (searchMode === 'all' || searchMode === 'content') {
      totalScore += calculateScore(note.content, 'content', 1);
    }
    
    if (searchMode === 'all' || searchMode === 'tags') {
      note.tags.forEach(tag => {
        totalScore += calculateScore(tag, 'tags', 2); // Tags are important
      });
    }

    // Only include notes with matches
    if (totalScore > 0 && matches.length > 0) {
      results.push({ 
        note, 
        matches: matches.sort((a, b) => (b.score || 0) - (a.score || 0)), // Sort matches by score
        totalScore 
      });
    }
  }
  
  // Sort results by total score (descending) and then by update date
  return results.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return b.note.updatedAt.getTime() - a.note.updatedAt.getTime();
  });
};

// Enhanced search with fuzzy matching
export const fuzzySearch = (query: string, notes: Note[]): SearchResult[] => {
  if (!query.trim()) return [];
  
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  
  for (const note of notes) {
    let score = 0;
    const matches: SearchResult['matches'] = [];
    
    // Fuzzy match in title (highest weight)
    const titleScore = fuzzyMatch(queryLower, note.title.toLowerCase());
    if (titleScore > 0.3) {
      score += titleScore * 100;
      matches.push({
        field: 'title',
        text: note.title,
        index: 0,
        score: titleScore * 100
      });
    }
    
    // Fuzzy match in content
    const contentScore = fuzzyMatch(queryLower, note.content.toLowerCase());
    if (contentScore > 0.2) {
      score += contentScore * 50;
      matches.push({
        field: 'content',
        text: note.content,
        index: 0,
        score: contentScore * 50
      });
    }
    
    // Exact match in tags (high weight)
    note.tags.forEach(tag => {
      if (tag.toLowerCase().includes(queryLower)) {
        score += 75;
        matches.push({
          field: 'tags',
          text: tag,
          index: tag.toLowerCase().indexOf(queryLower),
          score: 75
        });
      }
    });
    
    if (matches.length > 0) {
      results.push({ note, matches, totalScore: score });
    }
  }
  
  return results.sort((a, b) => b.totalScore - a.totalScore);
};

// Simple fuzzy matching algorithm
const fuzzyMatch = (pattern: string, text: string): number => {
  if (pattern.length === 0) return 1;
  if (text.length === 0) return 0;
  
  let patternIdx = 0;
  let textIdx = 0;
  let matches = 0;
  
  while (patternIdx < pattern.length && textIdx < text.length) {
    if (pattern[patternIdx] === text[textIdx]) {
      matches++;
      patternIdx++;
    }
    textIdx++;
  }
  
  return matches / pattern.length;
};