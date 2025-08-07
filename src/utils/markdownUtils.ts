import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Note } from '../types';

// Configure marked with custom renderer
const renderer = new marked.Renderer();

// Helper function to generate consistent heading IDs
export const generateHeadingId = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
};

// Custom heading renderer with IDs for anchor navigation
renderer.heading = (text: string, level: number) => {
  const sizes = {
    1: 'text-3xl font-bold mb-6 mt-8 text-gray-900 dark:text-white border-b border-gray-200 dark:border-dark-700 pb-2',
    2: 'text-2xl font-semibold mb-4 mt-6 text-gray-900 dark:text-white',
    3: 'text-xl font-medium mb-3 mt-5 text-gray-900 dark:text-white',
    4: 'text-lg font-medium mb-2 mt-4 text-gray-800 dark:text-gray-100',
    5: 'text-base font-medium mb-2 mt-3 text-gray-800 dark:text-gray-100',
    6: 'text-sm font-medium mb-2 mt-3 text-gray-700 dark:text-gray-200'
  };
  
  // Generate ID from text - strip any HTML tags first
  const cleanText = text.replace(/<[^>]*>/g, '');
  const id = generateHeadingId(cleanText);
  
  return `<h${level} id="${id}" class="${sizes[level as keyof typeof sizes] || sizes[6]} scroll-mt-4">
    <a href="#${id}" class="heading-anchor opacity-0 hover:opacity-100 transition-opacity text-blue-500 dark:text-blue-400 no-underline mr-2 text-sm" aria-label="Link to heading">
      #
    </a>
    ${text}
  </h${level}>`;
};

// Custom paragraph renderer
renderer.paragraph = (text: string) => {
  return `<p class="mb-4 leading-relaxed text-gray-900 dark:text-gray-100">${text}</p>`;
};

// Custom list renderers
renderer.list = (body: string, ordered: boolean) => {
  const tag = ordered ? 'ol' : 'ul';
  const classes = ordered 
    ? 'list-decimal list-inside mb-4 space-y-1 text-gray-900 dark:text-gray-100 pl-4'
    : 'list-disc list-inside mb-4 space-y-1 text-gray-900 dark:text-gray-100 pl-4';
  
  return `<${tag} class="${classes}">${body}</${tag}>`;
};

renderer.listitem = (text: string) => {
  return `<li class="leading-relaxed">${text}</li>`;
};

// Custom blockquote renderer
renderer.blockquote = (quote: string) => {
  return `<blockquote class="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 mb-4 bg-blue-50 dark:bg-blue-900/20 text-gray-800 dark:text-gray-200 italic rounded-r-lg">${quote}</blockquote>`;
};

function escapeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Custom code block renderer
renderer.code = (code: string, language?: string) => {
  const langClass = language ? `language-${language}` : '';
  return `<pre class="bg-gray-100 dark:bg-dark-700 rounded-lg p-4 mb-4 overflow-x-auto border border-gray-200 dark:border-dark-600"><code class="${langClass} text-sm font-mono text-gray-800 dark:text-gray-200">${escapeHtml(code)}</code></pre>`;
};

// Custom inline code renderer
renderer.codespan = (code: string) => {
  return `<code class="bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-sm font-mono border border-gray-200 dark:border-dark-600">${code}</code>`;
};

// Custom strong/bold renderer
renderer.strong = (text: string) => {
  return `<strong class="font-semibold text-gray-900 dark:text-white">${text}</strong>`;
};

// Custom emphasis/italic renderer
renderer.em = (text: string) => {
  return `<em class="italic text-gray-800 dark:text-gray-200">${text}</em>`;
};

// Custom link renderer
renderer.link = (href: string, title: string | null, text: string) => {
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${href}"${titleAttr} class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors" target="_blank" rel="noopener noreferrer">${text}</a>`;
};

// Custom horizontal rule renderer
renderer.hr = () => {
  return `<hr class="my-8 border-gray-300 dark:border-dark-600">`;
};

// Custom table renderers
renderer.table = (header: string, body: string) => {
  return `<div class="overflow-x-auto mb-4"><table class="min-w-full border border-gray-200 dark:border-dark-600 rounded-lg overflow-hidden">${header}${body}</table></div>`;
};

renderer.tablerow = (content: string) => {
  return `<tr class="border-b border-gray-200 dark:border-dark-600 last:border-b-0">${content}</tr>`;
};

renderer.tablecell = (content: string, flags: { header: boolean; align: string | null }) => {
  const tag = flags.header ? 'th' : 'td';
  const alignClass = flags.align ? `text-${flags.align}` : '';
  const baseClasses = flags.header 
    ? 'px-4 py-3 bg-gray-50 dark:bg-dark-700 font-semibold text-gray-900 dark:text-white'
    : 'px-4 py-3 text-gray-800 dark:text-gray-200';
  
  return `<${tag} class="${baseClasses} ${alignClass}">${content}</${tag}>`;
};

// Configure marked options
marked.setOptions({
  renderer,
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert \n to <br>
  pedantic: false,
});

export const renderMarkdown = async (content: string, notes: Note[]): Promise<string> => {
  // First, process note links [[Note Title]]
  let processedContent = processNoteLinks(content, notes);

  // Replace block math ($$...$$) with placeholders
  const blockMathMatches: string[] = [];
  processedContent = processedContent.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
    blockMathMatches.push(formula);
    return `:::BLOCKMATH${blockMathMatches.length - 1}:::`;
  });

  // Inline math: $...$ (loop until all consecutive inline math are replaced)
  const inlineMathRegex = /\$([^$\n]+?)\$/g;
  let prevContent;
  do {
    prevContent = processedContent;
    processedContent = processedContent.replace(inlineMathRegex, (match, formula) => {
      // Avoid matching inside code blocks
      if (/^\s*<code/.test(match)) return match;
      try {
        return katex.renderToString(formula, { displayMode: false });
      } catch (err) {
        return `<span class="katex-error">${escapeHtml(formula)}</span>`;
      }
    });
  } while (processedContent !== prevContent);

  // Then render markdown
  let htmlContent = await marked(processedContent);

  // Replace block math placeholders with KaTeX HTML (outside paragraphs/lists)
  blockMathMatches.forEach((formula, i) => {
    const katexHtml = (() => {
      try {
        return `<div class="katex-block">${katex.renderToString(formula, { displayMode: true })}</div>`;
      } catch (err) {
        return `<pre class="katex-error">${escapeHtml(formula)}</pre>`;
      }
    })();
    // Remove wrapping <p> if present
    htmlContent = htmlContent.replace(
      new RegExp(`<p>\s*:::BLOCKMATH${i}:::\s*</p>`, 'g'),
      katexHtml
    );
    // Remove wrapping <li> if present
    htmlContent = htmlContent.replace(
      new RegExp(`<li>\s*:::BLOCKMATH${i}:::\s*</li>`, 'g'),
      `<li style="list-style:none">${katexHtml}</li>`
    );
    // Fallback: replace any remaining placeholder
    htmlContent = htmlContent.replace(
      new RegExp(`:::BLOCKMATH${i}:::`, 'g'),
      katexHtml
    );
  });

  // Remove trailing empty paragraphs and <br> tags
  htmlContent = htmlContent.replace(/(<p>\s*<\/p>|<br\s*\/?>)+$/g, '');

  // Remove all .katex-mathml elements
  htmlContent = htmlContent.replace(/<span class="katex-mathml"[\s\S]*?<\/span>/g, '');

  return htmlContent;
};

const processNoteLinks = (content: string, notes: Note[]): string => {
  const noteMap = new Map(notes.map(note => [note.title.toLowerCase(), note.id]));
  
  return content.replace(/\[\[([^\]]+)\]\]/g, (match, linkText) => {
    const noteId = noteMap.get(linkText.toLowerCase());
    if (noteId) {
      // Convert to a special markdown link that we'll handle in the click handler
      return `[${linkText}](note://${noteId})`;
    }
    // Return as broken link with special styling
    return `<span class="note-link-broken text-gray-500 dark:text-dark-500 line-through">${linkText}</span>`;
  });
};

// Enhanced markdown processing with task lists and other GitHub features
export const processGitHubMarkdown = (content: string): string => {
  // Process task lists
  let processed = content.replace(/^(\s*)- \[([ x])\] (.+)$/gm, (match, indent, checked, text) => {
    const isChecked = checked === 'x';
    const checkboxClass = isChecked 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-gray-400 dark:text-dark-500';
    
    return `${indent}<div class="flex items-center gap-2 mb-1">
      <input type="checkbox" ${isChecked ? 'checked' : ''} disabled class="${checkboxClass}">
      <span class="${isChecked ? 'line-through text-gray-500 dark:text-dark-500' : 'text-gray-900 dark:text-gray-100'}">${text}</span>
    </div>`;
  });

  // Process strikethrough
  processed = processed.replace(/~~(.+?)~~/g, '<del class="text-gray-500 dark:text-dark-500">$1</del>');

  // Process highlights
  processed = processed.replace(/==(.+?)==/g, '<mark class="bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 px-1 rounded">$1</mark>');

  return processed;
};

// Function to extract and render table of contents
export const generateTableOfContents = (content: string): { id: string; text: string; level: number }[] => {
  const headings: { id: string; text: string; level: number }[] = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    // Strip any markdown formatting from the text for ID generation
    const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1');
    const id = generateHeadingId(cleanText);
    
    headings.push({ id, text: cleanText, level });
  }

  return headings;
};