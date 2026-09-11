/**
 * Utility to extract thinking/reasoning blocks and separate them from clean response content.
 * Supports <think>...</think> and <thinking>...</thinking> tags, as well as explicit thinking props.
 */
export function extractThinking(content = '', explicitThinking = null) {
  if (!content && !explicitThinking) {
    return { thinking: null, cleanContent: '' };
  }

  let thinking = explicitThinking || '';
  let cleanContent = content || '';

  // Regex for <think>...</think> and <thinking>...</thinking> (case insensitive, dotAll)
  const thinkRegex = /<(?:think|thinking)>([\s\S]*?)<\/(?:think|thinking)>/gi;
  
  const extractedBlocks = [];
  let match;

  while ((match = thinkRegex.exec(cleanContent)) !== null) {
    if (match[1] && match[1].trim()) {
      extractedBlocks.push(match[1].trim());
    }
  }

  // Remove the <think>...</think> blocks from clean content
  cleanContent = cleanContent.replace(thinkRegex, '').trim();

  // If there's an unclosed <think> or <thinking> tag (e.g. model output interrupted)
  const unclosedMatch = cleanContent.match(/<(?:think|thinking)>([\s\S]*)$/i);
  if (unclosedMatch) {
    if (unclosedMatch[1] && unclosedMatch[1].trim()) {
      extractedBlocks.push(unclosedMatch[1].trim());
    }
    cleanContent = cleanContent.replace(/<(?:think|thinking)>[\s\S]*$/i, '').trim();
  }

  // Combine extracted blocks if any were found in content
  if (extractedBlocks.length > 0) {
    const combined = extractedBlocks.join('\n\n---\n\n');
    thinking = thinking ? `${thinking}\n\n---\n\n${combined}` : combined;
  }

  return {
    thinking: thinking.trim() ? thinking.trim() : null,
    cleanContent: cleanContent
  };
}
