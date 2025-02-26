/**
 * Utility functions for markdown processing and cleaning
 */

interface CodeBlock {
  language: string;
  content: string;
  isInline: boolean;
}

/**
 * Detects the programming language from code block markers or content
 */
export function detectLanguage(content: string, className: string = ''): string {
  // Check for language in class name
  const classMatch = /language-(\w+)/.exec(className);
  if (classMatch) return classMatch[1];

  // Common language patterns
  const patterns: Record<string, RegExp[]> = {
    javascript: [
      /\b(const|let|var|function|class|import|export)\b/,
      /\b(React|useState|useEffect|async|await)\b/,
      /=>/,
    ],
    typescript: [
      /\b(interface|type|enum)\b/,
      /:\s*(string|number|boolean|any)\b/,
      /<[A-Z][^>]+>/,
    ],
    python: [
      /\b(def|class|import|from|if __name__ == ['"]__main__['"])\b/,
      /:\s*$/m,
    ],
    html: [
      /<\/?[a-z][\s\S]*>/i,
      /<!DOCTYPE\s+html>/i,
    ],
    css: [
      /[.#][a-z][a-z0-9]*\s*{/i,
      /\b(margin|padding|border|color):/,
    ],
    bash: [
      /\b(npm|yarn|git|docker|curl)\b/,
      /\$\s+[a-z]/i,
    ],
  };

  // Check content against patterns
  for (const [lang, regexes] of Object.entries(patterns)) {
    if (regexes.some(regex => regex.test(content))) {
      return lang;
    }
  }

  return '';
}

/**
 * Extracts and processes code blocks from markdown
 */
export function extractCodeBlocks(content: string): { blocks: CodeBlock[]; positions: number[] } {
  const blocks: CodeBlock[] = [];
  const positions: number[] = [];
  const lines = content.split('\n');
  let inBlock = false;
  let currentBlock = '';
  let currentLanguage = '';
  let blockStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const codeBlockMatch = line.match(/^```(\w*)/);

    if (codeBlockMatch) {
      if (!inBlock) {
        // Start of code block
        inBlock = true;
        currentLanguage = codeBlockMatch[1];
        blockStart = i;
      } else {
        // End of code block
        blocks.push({
          language: currentLanguage || detectLanguage(currentBlock),
          content: currentBlock.trim(),
          isInline: false,
        });
        positions.push(blockStart, i);
        currentBlock = '';
        inBlock = false;
      }
      continue;
    }

    if (inBlock) {
      // Inside code block
      const cleanedLine = line
        .replace(/^[\d_]+\s*/, '') // Remove line numbers and _13 markers
        .replace(/^\s{4}/, ''); // Remove common indentation
      currentBlock += cleanedLine + '\n';
    }
  }

  return { blocks, positions };
}

/**
 * Cleans markdown content by properly formatting code blocks
 */
export function cleanMarkdown(content: string | unknown): string {
  // Ensure content is string
  const markdownContent = typeof content === 'string' ? content : String(content);
  
  // Extract and process code blocks
  const { blocks, positions } = extractCodeBlocks(markdownContent);
  const lines = markdownContent.split('\n');
  const cleanedLines: string[] = [];
  let currentPos = 0;

  // Rebuild markdown with cleaned code blocks
  for (let i = 0; i < lines.length; i++) {
    if (positions.includes(i)) {
      const blockIndex = Math.floor(positions.indexOf(i) / 2);
      const block = blocks[blockIndex];
      const isStart = positions.indexOf(i) % 2 === 0;

      if (isStart) {
        cleanedLines.push('```' + block.language);
        cleanedLines.push(block.content);
      } else {
        cleanedLines.push('```');
      }
      currentPos = i + 1;
    } else if (!positions.includes(Math.floor(i / 2) * 2)) {
      // Not in a code block
      cleanedLines.push(lines[i]);
    }
  }

  return cleanedLines.join('\n')
    .replace(/\n{3,}/g, '\n\n') // Remove extra newlines
    .trim();
}

/**
 * Formats inline code snippets
 */
export function formatInlineCode(content: string): string {
  return content.replace(/`([^`]+)`/g, (_, code) => {
    const cleaned = code
      .replace(/^[\d_]+\s*/, '') // Remove line numbers and markers
      .trim();
    return '`' + cleaned + '`';
    });
  }
  
  /**
   * Splits markdown content into sections based on headers
   * @param content - The markdown content to split
   * @returns Array of objects containing section names and content
   */
  export function splitMarkdownByHeaders(content: string): { name: string; content: string }[] {
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;
    const sections: { name: string; content: string }[] = [];
    let currentSection: { name: string; content: string } | null = null;
    let lastIndex = 0;
  
    // Find all headers and their positions
    let match: RegExpExecArray | null;
    const matches: RegExpExecArray[] = [];
    
    while ((match = headerRegex.exec(content)) !== null) {
      matches.push(match);
    }
  
    for (let i = 0; i < matches.length; i++) {
      const [fullMatch, hashes, headerText] = matches[i];
      const headerLevel = hashes.length;
      const sectionName = headerText.trim();
      
      // Get content between current header and next header (or end of file)
      const start = matches[i].index! + fullMatch.length;
      const end = matches[i + 1]?.index || content.length;
      const sectionContent = content.slice(start, end).trim();
  
      // Create new section
      sections.push({
        name: sectionName,
        content: `#${'#'.repeat(headerLevel - 1)} ${sectionName}\n\n${sectionContent}`
      });
    }
  
    // If no headers found, return the entire content as one section
    if (sections.length === 0) {
      sections.push({
        name: 'Document',
        content: content
      });
    }
  
    return sections;
  }
