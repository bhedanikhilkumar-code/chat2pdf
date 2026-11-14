/**
 * Chat2PDF Safe DOM Probe Tool
 * 
 * ZERO NETWORK CALLS. ZERO PRIVACY LEAKS.
 * - Samples user AND assistant message blocks separately.
 * - Redacts all text to "#<length>".
 * - Redacts attribute values (aria-label, data-*, alt, title, href, src, etc.) to "#<length>".
 * - Preserves ONLY structural allowlist: data-testid, data-message-author-role, role.
 * - NEVER outputs file names, URLs, or message content.
 * - Copies sanitized structural JSON to clipboard via copy().
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

  // 1. Host and sanitized URL shape (never leaks session IDs or tokens)
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

  // 3. Histograms: data-testid (allowlisted), data-* attribute names, custom element tags
  const dataTestIdCounts = {};
  const dataAttrCounts = {};
  const customElementCounts = {};

  for (const el of allElements) {
    const tag = el.tagName.toLowerCase();
    if (tag.includes('-')) {
      customElementCounts[tag] = (customElementCounts[tag] || 0) + 1;
    }

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

  // 5. Candidate message selectors evaluation (counts for ALL, never stops early)
  const roleHintSelectors = [
    '[data-message-author-role="user"]',
    '[data-message-author-role="assistant"]',
    '[data-message-author-role]',
    '[data-message-id]',
    '[data-testid*="user" i]',
    '[data-testid*="assistant" i]',
    '[data-testid*="message" i]',
    '[data-testid*="conversation-turn" i]',
    '[data-testid*="response" i]',
    '[data-testid*="query" i]',
    'article',
    '.font-user-message',
    '.font-claude-message',
    'user-query',
    'model-response',
    '[class*="message" i]',
    '[class*="turn" i]',
  ];

  const candidateCounts = {};
  for (const sel of roleHintSelectors) {
    try {
      const matched = document.querySelectorAll(sel);
      candidateCounts[sel] = matched.length;
    } catch {
      candidateCounts[sel] = 0;
    }
  }

  function filterOutWrappers(elements) {
    return elements.filter((el) => {
      return !elements.some((other) => other !== el && el.contains(other));
    });
  }

  // Separate candidate selection for USER and ASSISTANT
  const userSelectors = [
    '[data-message-author-role="user"]',
    '[data-testid*="user-message" i]',
    'user-query, [data-test-id="user-query"]',
    '.font-user-message',
    '[class*="font-user" i]',
    '[class*="user-message" i]',
    '[data-testid*="user" i]',
  ];

  let candidateUserElements = [];
  for (const sel of userSelectors) {
    try {
      const matched = Array.from(document.querySelectorAll(sel));
      if (matched.length > 0) {
        candidateUserElements = filterOutWrappers(matched);
        break;
      }
    } catch {}
  }

  const assistantSelectors = [
    '[data-message-author-role="assistant"]',
    '[data-testid*="assistant-message" i]',
    'model-response, [data-test-id="model-response"]',
    '.font-claude-message',
    '[class*="font-claude" i]',
    '[class*="progressive-markdown" i]',
    '[class*="assistant-message" i]',
    '[data-testid*="response" i]',
    '[data-testid*="assistant" i]',
  ];

  let candidateAssistantElements = [];
  for (const sel of assistantSelectors) {
    try {
      const matched = Array.from(document.querySelectorAll(sel));
      if (matched.length > 0) {
        candidateAssistantElements = filterOutWrappers(matched);
        break;
      }
    } catch {}
  }

  // Fallback if specific lists were empty
  if (candidateUserElements.length === 0 || candidateAssistantElements.length === 0) {
    const genericTurns = filterOutWrappers(Array.from(document.querySelectorAll('[data-message-author-role], article, [data-testid*="conversation-turn"]')));
    if (candidateUserElements.length === 0) {
      candidateUserElements = genericTurns.filter(el => {
        const role = el.getAttribute('data-message-author-role') || '';
        const testid = el.getAttribute('data-testid') || '';
        return role === 'user' || /user/i.test(testid) || el.querySelector('[data-message-author-role="user"]');
      });
    }
    if (candidateAssistantElements.length === 0) {
      candidateAssistantElements = genericTurns.filter(el => {
        const role = el.getAttribute('data-message-author-role') || '';
        const testid = el.getAttribute('data-testid') || '';
        return role === 'assistant' || /assistant|response|model/i.test(testid) || el.querySelector('[data-message-author-role="assistant"]');
      });
    }
  }

  const allCandidateElements = filterOutWrappers(Array.from(
    document.querySelectorAll('[data-message-author-role], article, [data-testid*="conversation-turn"], .font-user-message, .font-claude-message, user-query, model-response')
  ));

  // 6. SKELETON Tree Builder with STRICT Attribute Redaction Allowlist
  const ALLOWLISTED_ATTRS = new Set([
    'data-testid',
    'data-message-author-role',
    'role',
  ]);

  const REDACT_ATTRS = new Set([
    'aria-label',
    'alt',
    'title',
    'href',
    'src',
    'srcset',
    'poster',
    'action',
    'cite',
  ]);

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

    // Collect attributes: ONLY allowlisted attributes keep raw values;
    // ALL data-*, aria-*, alt, title, href, src, etc. are REDACTED to "#<length>".
    // Never output file names, URLs, or user text!
    const attrs = {};
    for (let i = 0; i < el.attributes.length; i++) {
      const a = el.attributes[i];
      const name = a.name.toLowerCase();
      if (ALLOWLISTED_ATTRS.has(name)) {
        attrs[name] = a.value;
      } else if (
        name.startsWith('data-') ||
        name.startsWith('aria-') ||
        REDACT_ATTRS.has(name)
      ) {
        attrs[name] = `#${(a.value || '').length}`;
      }
    }

    const item = {
      tag,
      classes: Array.from(el.classList).slice(0, 10),
      attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
    };

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
      item.children = children.slice(0, 20);
    }

    return item;
  }

  function sampleElements(arr, maxFirst = 2, maxLast = 1) {
    if (arr.length <= maxFirst + maxLast) return arr;
    return [...arr.slice(0, maxFirst), ...arr.slice(-maxLast)];
  }

  const userSamples = sampleElements(candidateUserElements, 2, 1);
  const assistantSamples = sampleElements(candidateAssistantElements, 2, 1);

  const userSkeletons = userSamples.map((el, idx) => ({
    sampleRole: 'user',
    sampleIndex: idx < 2 ? `user_first_${idx + 1}` : `user_last_${userSamples.length - idx}`,
    cssPath: getShortCssPath(el),
    skeleton: buildSkeleton(el, 0),
  }));

  const assistantSkeletons = assistantSamples.map((el, idx) => ({
    sampleRole: 'assistant',
    sampleIndex: idx < 2 ? `assistant_first_${idx + 1}` : `assistant_last_${assistantSamples.length - idx}`,
    cssPath: getShortCssPath(el),
    skeleton: buildSkeleton(el, 0),
  }));

  // 7. Theme snapshot (colors only, zero text)
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
  const isDark = getLuminance(bodyBg) < 0.5;

  const themeInfo = {
    html: { background: htmlStyle.backgroundColor, color: htmlStyle.color },
    body: { background: bodyStyle.backgroundColor, color: bodyStyle.color },
    main: { background: mainStyle.backgroundColor, color: mainStyle.color },
    decision: isDark ? 'dark' : 'light',
  };

  // 8. Attachment hints inside candidate blocks (pure integer counts, zero filenames/URLs)
  let imgCount = 0;
  let fileTestIdCount = 0;
  let ariaAttachCount = 0;

  for (const block of allCandidateElements) {
    imgCount += block.querySelectorAll('img').length;
    fileTestIdCount += block.querySelectorAll('[data-testid*="file" i], [data-testid*="attachment" i]').length;
    ariaAttachCount += block.querySelectorAll('[aria-label*="attach" i], [aria-label*="file" i]').length;
  }

  const attachmentHints = {
    imgTags: imgCount,
    fileTestIdTags: fileTestIdCount,
    ariaAttachTags: ariaAttachCount,
  };

  // 9. Final Report Assembly
  const report = {
    probeVersion: '2.0.0',
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
    totalCandidateElementsInDom: allCandidateElements.length,
    totalUserCandidatesInDom: candidateUserElements.length,
    totalAssistantCandidatesInDom: candidateAssistantElements.length,
    attachmentHints,
    themeInfo,
    messageSkeletons: {
      user: userSkeletons,
      assistant: assistantSkeletons,
    },
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
  console.log('1. If the chat is long and virtualized, scroll to the top of the chat.');
  console.log('2. Run this script again to verify how many elements remain in the DOM.');
  console.log('3. Paste the copied JSON report into the chat with the assistant.');

  return report;
})();
