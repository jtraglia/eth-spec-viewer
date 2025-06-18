/**
 * Enhanced Python syntax highlighting
 * Runs after Prism to add more colorization to function bodies
 */

/**
 * Enhance Python syntax highlighting in code blocks
 */
export function enhancePythonSyntax() {
  // Wait for Prism to finish
  setTimeout(() => {
    const pythonBlocks = document.querySelectorAll('code.language-python');
    
    pythonBlocks.forEach(block => {
      // Skip if already processed
      if (block.dataset.enhanced) return;
      
      // Direct HTML processing approach
      let html = block.innerHTML;
      
      // Replace function calls that aren't already in spans
      // Look for patterns like "word(" that aren't inside existing token spans
      const lines = html.split('\n');
      const processedLines = lines.map(line => {
        // Skip lines that are already heavily tokenized
        if (line.includes('<span class="token')) {
          // For tokenized lines, we need to be more careful
          // Split on existing spans and only process the plain text parts
          const parts = line.split(/(<span[^>]*>.*?<\/span>)/);
          return parts.map(part => {
            if (part.includes('<span')) {
              return part; // Don't modify existing spans
            } else {
              // Process plain text for function calls
              return part.replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, '<span class="token function-call">$1</span>');
            }
          }).join('');
        } else {
          // For lines with no tokens, process normally
          return line.replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, '<span class="token function-call">$1</span>');
        }
      });
      
      const newHTML = processedLines.join('\n');
      
      if (newHTML !== html) {
        block.innerHTML = newHTML;
      }
      
      block.dataset.enhanced = 'true';
    });
  }, 150); // Increase timeout to ensure Prism is done
}

/**
 * Initialize enhanced syntax highlighting
 */
export function initEnhancedSyntax() {
  // Run initial enhancement
  enhancePythonSyntax();
  
  // Also enhance when new content is added
  const observer = new MutationObserver(() => {
    enhancePythonSyntax();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}