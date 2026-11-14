/**
 * Chat2PDF Safe DOM Probe Tool
 * 
 * ZERO NETWORK CALLS. ZERO PRIVACY LEAKS.
 * Replaces all real text with "#<length>".
 * Copies sanitized structural JSON to your clipboard via copy().
 */
(() => {
  console.log('%c[Chat2PDF DOM Probe] Analyzing DOM structure safely...', 'color: #2563eb; font-weight: bold; font-size: 14px;');

  function getShortCssPath(el) {
    if (!el || el === document.body || el === document.documentElement) {
      return el ? el.tagName.toLowerCase() : '';
    }
    const parts = [];
    let curr = el;
    while (curr && curr !== document.body && curr !== document.documentElement && parts.length < 5) {
      let segment = curr.tagName.toLowerCase();
      if (curr.id && !/\d{4,}/.test(curr.id)) {
        segment += `#${curr.id}`;
        parts.unshift(segment);
        break;
      }
      if (curr.getAttribute('data-testid')) {
        segment += `[data-testid="${curr.getAttribute('data-testid')}"]`;
        parts.unshift(segment);
        break;
      }
      const classes = Array.from(curr.classList).filter(c => !/^[a-z0-9_-]{1,2}$|active|selected|hover|focus/i.test(c)).slice(0, 2);
      if (classes.length > 0) {
        segment += `.${classes.join('.')}`;
      }
      parts.unshift(segment);
      curr = curr.parentElement;
    }
    return parts.join(' > ');
  }

  // 1. Host and sanitized URL shape
  const host = window.location.hostname;
  const pageTitleLength = (document.title || '').length;
  const urlPathShape = window.location.pathname
    .replace(/[0-9a-fA-F-]{8,}/g, '<uuid>')
    .replace(/\d{4,}/g, '<id>')
    .replace(/\/\d+/g, '/<num>');

  // 2. Scroll Containers (overflow-y auto/scroll with scrollHeight > clientHeight)
  const allElements = Array.from(document.querySelectorAll('*'));
  const scrollContainers = [];

  for (const el of allElements) {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10) {
      scrollContainers.push({
        selector: getShortCssPath(el),
        tag: el.tagName.toLowerCase(),
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        scrollTop: el.scrollTop,
        overflowY,
      });
    }
  }

  // 3. Histograms: data-testid, data-* attributes, custom elements (tags with '-')
  const dataTestIdCounts = {};
  const dataAttrCounts = {};
  const customElementCounts = {};

  for (const el of allElements) {
    // Custom elements
    const tag = el.tagName.toLowerCase();
    if (tag.includes('-')) {
      customElementCounts[tag] = (customElementCounts[tag] || 0) + 1;
    }

    // Attributes
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (attr.name === 'data-testid') {
        dataTestIdCounts[attr.value] = (dataTestIdCounts[attr.value] || 0) + 1;
      }
      if (attr.name.startsWith('data-')) {
        dataAttrCounts[attr.name] = (dataAttrCounts[attr.name] || 0) + 1;
      }
    }
  }

  // 4. Histogram of the 40 most common class tokens on elements with >50 chars text
  const classCounts = {};
  for (const el of allElements) {
    const textLen = (el.textContent || '').trim().length;
    if (textLen > 50 && el.classList.length > 0) {
      for (const cls of el.classList) {
        classCounts[cls] = (classCounts[cls] || 0) + 1;
      }
    }
  }
  const top40Classes = Object.entries(classCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

  // 5. Candidate message blocks
  const roleHintSelectors = [
    '[data-message-author-role]',
    '[data-message-id]',
    '[data-testid*="message" i]',
    '[data-testid*="conversation-turn" i]',
    '[data-testid*="user" i]',
    '[data-testid*="assistant" i]',
    '[data-testid*="response" i]',
    '[data-testid*="query" i]',
    'article',
    '.font-claude-message',
    '[class*="message" i]',
    '[class*="Message" i]',
    '[class*="turn" i]',
  ];

  const candidateCounts = {};
  let candidateElements = [];

  for (const sel of roleHintSelectors) {
    try {
      const matched = document.querySelectorAll(sel);
      candidateCounts[sel] = matched.length;
      if (matched.length > 0 && candidateElements.length === 0 && !sel.startsWith('[class*=')) {
        // Prefer specific attribute-based selectors
        candidateElements = Array.from(matched);
      }
    } catch {}
  }

  // Fallback candidate element selection
  if (candidateElements.length === 0) {
    candidateElements = Array.from(document.querySelectorAll('article, [data-message-author-role], [data-testid*="message"]'));
  }

  // 6. Build a Redacted SKELETON tree (depth <= 7) of first 3 and last 2 message-like blocks
  function buildSkeleton(node, depth = 0) {
    if (!node || depth > 7) return null;

    if (node.nodeType === Node.TEXT_NODE) {
      const txt = (node.textContent || '').trim();
      if (!txt) return null;
      return { type: 'text', length: `#${txt.length}` };
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const el = node;
    const tag = el.tagName.toLowerCase();

    // Collect data-* attributes and key structural attrs
    const attrs = {};
    for (let i = 0; i < el.attributes.length; i++) {
      const a = el.attributes[i];
      if (a.name.startsWith('data-') || a.name.startsWith('aria-') || a.name === 'role') {
        attrs[a.name] = a.value;
      }
    }

    const item = {
      tag,
      classes: Array.from(el.classList).slice(0, 10),
      attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
    };

    // If leaf node with text
    const childNodes = Array.from(el.childNodes);
    const hasOnlyText = childNodes.length === 1 && childNodes[0].nodeType === Node.TEXT_NODE;
    if (hasOnlyText) {
      const txt = (childNodes[0].textContent || '').trim();
      item.text = `#${txt.length}`;
      return item;
    }

    const children = [];
    for (const child of childNodes) {
      const skelChild = buildSkeleton(child, depth + 1);
      if (skelChild) children.push(skelChild);
    }

    if (children.length > 0) {
      item.children = children.slice(0, 20); // Cap per-level siblings to prevent oversized JSON
    }

    return item;
  }

  const selectedForSkeleton = [];
  if (candidateElements.length <= 5) {
    selectedForSkeleton.push(...candidateElements);
  } else {
    selectedForSkeleton.push(...candidateElements.slice(0, 3));
    selectedForSkeleton.push(...candidateElements.slice(-2));
  }

  const skeletons = selectedForSkeleton.map((el, idx) => ({
    sampleIndex: idx < 3 ? `first_${idx + 1}` : `last_${selectedForSkeleton.length - idx}`,
    cssPath: getShortCssPath(el),
    skeleton: buildSkeleton(el, 0),
  }));

  // 7. Theme snapshot
  const htmlStyle = window.getComputedStyle(document.documentElement);
  const bodyStyle = window.getComputedStyle(document.body);
  const mainEl = document.querySelector('main') || document.body;
  const mainStyle = window.getComputedStyle(mainEl);

  function getLuminance(rgbStr) {
    const match = rgbStr.match(/\d+/g);
    if (!match || match.length < 3) return 1;
    const [r, g, b] = match.map(Number);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  const bodyBg = bodyStyle.backgroundColor || htmlStyle.backgroundColor || 'rgb(255,255,255)';
  const bodyColor = bodyStyle.color || htmlStyle.color || 'rgb(0,0,0)';
  const isDark = getLuminance(bodyBg) < 0.5;

  const themeInfo = {
    html: { background: htmlStyle.backgroundColor, color: htmlStyle.color },
    body: { background: bodyStyle.backgroundColor, color: bodyStyle.color },
    main: { background: mainStyle.backgroundColor, color: mainStyle.color },
    decision: isDark ? 'dark' : 'light',
  };

  // 8. Attachment hints inside candidate blocks
  let imgCount = 0;
  let fileTestIdCount = 0;
  let ariaAttachCount = 0;

  for (const block of candidateElements) {
    imgCount += block.querySelectorAll('img').length;
    fileTestIdCount += block.querySelectorAll('[data-testid*="file" i], [data-testid*="attachment" i]').length;
    ariaAttachCount += block.querySelectorAll('[aria-label*="attach" i], [aria-label*="file" i]').length;
  }

  const attachmentHints = {
    imgTags: imgCount,
    fileTestIdTags: fileTestIdCount,
    ariaAttachTags: ariaAttachCount,
  };

  // Build Final Report
  const report = {
    probeVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    host,
    pageTitleLength,
    urlPathShape,
    scrollContainers,
    dataTestIdCounts,
    dataAttrNamesHistogram: dataAttrCounts,
    customElementTagsHistogram: customElementCounts,
    top40Classes,
    candidateMessageBlockCounts: candidateCounts,
    totalCandidateElementsInDom: candidateElements.length,
    attachmentHints,
    themeInfo,
    messageSkeletons: skeletons,
  };

  const reportJson = JSON.stringify(report, null, 2);

  // Copy to clipboard if supported
  if (typeof copy === 'function') {
    copy(reportJson);
    console.log('%c[Chat2PDF DOM Probe] SUCCESS! The report has been copied to your clipboard!', 'color: #059669; font-weight: bold; font-size: 15px;');
  } else {
    console.log('[Chat2PDF DOM Probe] Report generated. Copy below JSON:');
    console.log(reportJson);
  }

  console.log('\n%c--- NEXT STEPS FOR LONG CHATS ---', 'font-weight: bold; color: #d97706;');
  console.log('1. If the chat is long and virtualized, scroll all the way to the top of the chat.');
  console.log('2. Watch whether older messages load in.');
  console.log('3. Run the script again to see if totalCandidateElementsInDom increases.');
  console.log('4. Paste the copied JSON report into the chat with the assistant.');

  return report;
})();
