/**
 * Chat2PDF Redacted Diagnostics Generator
 *
 * Produces a safe, zero-PII diagnostic report containing ONLY structure and metrics.
 * - URL path IDs replaced with :id
 * - All text replaced with #<length>
 * - Only allowlisted attributes (data-testid, data-message-author-role, role) keep their values;
 *   all other attribute values are redacted to #<length>.
 * - Zero message text, zero URLs, zero file names, zero user account data.
 */

import type { SiteSelectors } from '../../core/parser/types';
import type { CompletenessReport } from './completeness';
import type { PipelineDiagnostics } from './extractor';
import { safeQuerySelectorAll } from './dom-utils';

export interface RedactedNodeSkeleton {
  tag: string;
  classes: string[];
  attributes: Record<string, string>;
  textLength: number;
  childCount: number;
  children?: RedactedNodeSkeleton[];
}

export interface DiagnosticsReport {
  timestamp: string;
  extensionVersion: string;
  host: string;
  urlPathShape: string;
  pipelineStages: {
    rawNodesFound: number;
    afterRoleClassification: number;
    afterCleaning: number;
    afterDedupe: number;
    afterMerge: number;
    final: number;
  };
  metrics: {
    rounds: number;
    elapsedMs: number;
    buttonsClicked: number;
    perSelectorHits?: Record<string, number>;
  };
  fallback: {
    used: boolean;
    guessedRoleCount: number;
    ancestorPath?: string;
  };
  scrollContainer: {
    cssPath: string;
    clientHeight: number;
    scrollHeight: number;
    scrollTop: number;
  };
  completeness: CompletenessReport;
  skeleton: {
    firstTwo: RedactedNodeSkeleton[];
    lastTwo: RedactedNodeSkeleton[];
  };
}

const ALLOWLISTED_ATTRS = new Set([
  'data-testid',
  'data-message-author-role',
  'role',
]);

/**
 * Redacts a URL pathname by replacing IDs, hashes, and UUIDs with :id.
 */
export function redactUrlPath(pathname: string): string {
  return pathname
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/[0-9a-f]{16,}/gi, ':id')
    .replace(/\b\d{4,}\b/g, ':id');
}

/**
 * Builds a redacted node skeleton with zero leaked text or unapproved attribute values.
 */
export function buildRedactedSkeleton(el: HTMLElement, maxDepth = 2): RedactedNodeSkeleton {
  const tag = el.tagName ? el.tagName.toLowerCase() : 'unknown';
  const classes = el.className && typeof el.className === 'string'
    ? el.className.split(/\s+/).filter(Boolean).slice(0, 5)
    : [];

  const attributes: Record<string, string> = {};
  if (el.attributes) {
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      const name = attr.name.toLowerCase();
      if (ALLOWLISTED_ATTRS.has(name)) {
        attributes[name] = attr.value;
      } else {
        // Redact any other attribute value to #<length>
        attributes[name] = `#${attr.value.length}`;
      }
    }
  }

  const rawText = el.textContent || '';
  const textLength = rawText.trim().length;

  const skeleton: RedactedNodeSkeleton = {
    tag,
    classes,
    attributes,
    textLength,
    childCount: el.children.length,
  };

  if (maxDepth > 0 && el.children.length > 0) {
    skeleton.children = Array.from(el.children)
      .slice(0, 4)
      .map((child) => buildRedactedSkeleton(child as HTMLElement, maxDepth - 1));
  }

  return skeleton;
}

/**
 * Gets CSS path for scroll container without sensitive IDs or classes
 */
export function getContainerPath(el: HTMLElement | null): string {
  if (!el) return 'none';
  const parts: string[] = [];
  let curr: HTMLElement | null = el;
  while (curr && curr !== document.body && parts.length < 4) {
    let p = curr.tagName ? curr.tagName.toLowerCase() : 'div';
    const role = curr.getAttribute('role');
    if (role) p += `[role="${role}"]`;
    parts.unshift(p);
    curr = curr.parentElement;
  }
  return parts.join(' > ');
}

/**
 * Compiles the complete zero-leak diagnostics report
 */
export function buildDiagnosticsReport(params: {
  host: string;
  urlPath: string;
  version?: string;
  pipelineStats: PipelineDiagnostics;
  completeness: CompletenessReport;
  scrollContainer: HTMLElement | null;
  buttonsClicked?: number;
  fallbackUsed?: boolean;
  guessedRoleCount?: number;
  ancestorPath?: string;
  selectorMetrics?: Record<string, number>;
  messageElements?: HTMLElement[];
}): DiagnosticsReport {
  const {
    host,
    urlPath,
    version = '1.2.0',
    pipelineStats,
    completeness,
    scrollContainer,
    buttonsClicked = 0,
    fallbackUsed = false,
    guessedRoleCount = 0,
    ancestorPath,
    selectorMetrics,
    messageElements = [],
  } = params;

  let firstTwo: RedactedNodeSkeleton[] = [];
  let lastTwo: RedactedNodeSkeleton[] = [];

  if (messageElements.length > 0) {
    firstTwo = messageElements.slice(0, 2).map((el) => buildRedactedSkeleton(el));
    if (messageElements.length > 2) {
      lastTwo = messageElements.slice(-2).map((el) => buildRedactedSkeleton(el));
    }
  }

  return {
    timestamp: new Date().toISOString(),
    extensionVersion: version,
    host,
    urlPathShape: redactUrlPath(urlPath),
    pipelineStages: {
      rawNodesFound: pipelineStats.rawNodesFound,
      afterRoleClassification: pipelineStats.afterRoleClassification,
      afterCleaning: pipelineStats.afterCleaning,
      afterDedupe: pipelineStats.afterDedupe,
      afterMerge: pipelineStats.afterMerge,
      final: pipelineStats.final,
    },
    metrics: {
      rounds: pipelineStats.rounds,
      elapsedMs: pipelineStats.elapsedMs,
      buttonsClicked,
      perSelectorHits: selectorMetrics,
    },
    fallback: {
      used: fallbackUsed,
      guessedRoleCount,
      ancestorPath,
    },
    scrollContainer: {
      cssPath: getContainerPath(scrollContainer),
      clientHeight: scrollContainer?.clientHeight || 0,
      scrollHeight: scrollContainer?.scrollHeight || 0,
      scrollTop: scrollContainer?.scrollTop || 0,
    },
    completeness,
    skeleton: {
      firstTwo,
      lastTwo,
    },
  };
}
