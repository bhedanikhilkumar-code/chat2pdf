import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { Packer } from 'docx';
import { buildDocxDocument } from '../src/core/exporters/exportDocx';
import { buildPptxPresentation } from '../src/core/exporters/exportPptx';
import type { Conversation } from '../src/core/parser/types';
import { WATERMARK_TEXT } from '../src/core/branding';

function createSynthetic32MessageChat(): Conversation {
  const messages: any[] = [
    {
      id: 'm-1',
      role: 'user' as const,
      content: 'नमस्ते! कैन यू एक्सप्लेन distributed systems architecture with real-world patterns? 🚀 💡 Please include Hindi/Hinglish explanations.',
      attachments: [
        { name: 'cluster-spec.yaml', size: '2.4 MB' },
        { name: 'topology.png', size: '512 KB' },
      ],
    },
    {
      id: 'm-2',
      role: 'assistant' as const,
      content: `नमस्ते! यहाँ डिस्ट्रीब्यूटेड सिस्टम्स (Distributed Systems) का व्यापक तकनीकी विश्लेषण (deep technical analysis) प्रस्तुत है।

### 1. Consensus & Quorum Architecture
जब सिस्टम में कई नोड्स होते हैं, तो सर्वसम्मति (consensus) प्राप्त करना अत्यंत महत्वपूर्ण होता है।

| Component | Target Latency | Quorum Size | Failover Time | Status |
| :--- | :--- | :--- | :--- | :--- |
| Ingestion Gateway | < 10ms | 3/5 Nodes | 250ms | Optimal ⚡ |
| State Machine Replication | < 25ms | Majority | 400ms | Resilient 🛡️ |
| Persistent Wal Storage | < 5ms | Local Disk | 0ms | Active 💾 |
| Global Coordinator | < 50ms | Multi-Region | 1.2s | Monitored 📊 |

### 2. Implementation Algorithm in Python
यहाँ कोर सर्वसम्मति सत्यापन का पाइथन कार्यान्वयन दिया गया है:

\`\`\`python
def calculate_distributed_consensus(nodes, quorum_threshold=0.67):
    """
    Raft/Paxos inspired cluster state verification with heartbeat telemetry.
    Calculates healthy quorum ratio across partitioned availability zones.
    """
    import math
    alive_nodes = [node for node in nodes if node.get("is_alive", False)]
    total_count = len(nodes)
    if total_count == 0:
        return False
    current_ratio = len(alive_nodes) / float(total_count)
    return current_ratio >= quorum_threshold
\`\`\`

### 3. Nested Architectural Hierarchy
- 1. Core Platform Services
  - a. Storage & Consensus Tier
    - i. Append-only WAL Engine
    - ii. Segment Compactor & Snapshotter
  - b. Ingress Control Plane
    - i. Mutual TLS Authenticator
    - ii. Adaptive Rate Limiter

### 4. Critical Disaster Recovery Documentation
Refer to the official architecture guideline at:
https://cloud.google.com/architecture/patterns-for-distributed-systems-resilience-and-disaster-recovery-in-multi-region-deployments-with-zero-data-loss-and-minimal-failover-rpo-rto

### 5. Mathematical Convergence Formula
$$\\sum_{i=1}^{n} \\frac{x_i - \\mu}{\\sigma} \\approx 0$$
`,
    },
    {
      id: 'm-3',
      role: 'user' as const,
      content: 'Can you provide the detailed network latency breakdown across 10 global edge locations?',
    },
  ];

  for (let i = 4; i <= 32; i++) {
    const isUser = i % 2 !== 0;
    messages.push({
      id: `m-${i}`,
      role: isUser ? ('user' as const) : ('assistant' as const),
      content: isUser
        ? `User follow-up inquiry #${i}: What about partition tolerance under Byzantine conditions?`
        : `Assistant response #${i}: In Byzantine fault tolerant setups (BFT), we ensure consensus even if up to 1/3 of the participants behave arbitrarily or maliciously. Multi-round cryptographic message signing and gossip protocols prevent split-brain states.`,
    });
  }

  return {
    title: 'Distributed Systems & Consensus Architecture',
    source: 'Claude',
    exportedAt: '2026-11-15T00:00:00.000Z',
    messages,
  };
}

describe('Programmatic DOCX & PPTX XML Structure Checks (Task 4)', () => {
  const chat = createSynthetic32MessageChat();

  for (const pageStyle of ['light', 'dark'] as const) {
    describe(`DOCX Export Structure (${pageStyle.toUpperCase()})`, () => {
      it(`verifies word/document.xml and word/footer.xml structure without LibreOffice`, async () => {
        const doc = buildDocxDocument(chat, {
          format: 'docx',
          pageStyle,
          filterMode: 'all',
          includeTitle: true,
        });

        const buffer = await Packer.toBuffer(doc);
        expect(buffer.length).toBeGreaterThan(5000);

        const zip = await JSZip.loadAsync(buffer);

        // Check word/document.xml
        const docXmlFile = zip.file('word/document.xml');
        expect(docXmlFile).not.toBeNull();
        const docXml = await docXmlFile!.async('string');

        // 1. Table exists
        expect(docXml).toContain('<w:tbl');
        expect(docXml).toContain('Ingestion Gateway');
        expect(docXml).toContain('State Machine Replication');

        // 2. Code blocks with Consolas
        expect(docXml).toContain('Consolas');
        expect(docXml).toContain('calculate_distributed_consensus');
        expect(docXml).toContain('quorum_threshold');

        // 3. List items present
        expect(docXml).toContain('Core Platform Services');

        // 4. Hindi text present
        expect(docXml).toContain('नमस्ते');
        expect(docXml).toContain('सर्वसम्मति');

        // 5. No raw $$ or \frac
        expect(docXml).not.toContain('$$');
        expect(docXml).not.toContain('\\frac');
        expect(docXml).not.toContain('\\sum');

        // 6. No style names printed as visible text ("DARK" or "LIGHT")
        // Check that neither "Style: DARK" nor "Style: LIGHT" nor standalone "DARK"/"LIGHT" headers exist
        expect(docXml).not.toMatch(/Style:\s*(DARK|LIGHT)/i);
        expect(docXml).not.toMatch(/<w:t[^>]*>(DARK|LIGHT)<\/w:t>/);

        // 7. Check footers for watermark and page number
        const footerFiles = Object.keys(zip.files).filter((name) => /^word\/footer\d+\.xml$/.test(name));
        expect(footerFiles.length).toBeGreaterThan(0);

        for (const footerPath of footerFiles) {
          const footerXml = await zip.file(footerPath)!.async('string');
          expect(footerXml).toContain(WATERMARK_TEXT);
          expect(footerXml).toMatch(/PAGE/);
          expect(footerXml).toMatch(/w:instrText/);
        }
      });
    });

    describe(`PPTX Export Structure (${pageStyle.toUpperCase()})`, () => {
      it(`verifies slide XMLs, watermark, and table shapes without LibreOffice`, async () => {
        const pptx = buildPptxPresentation(chat, {
          format: 'pptx',
          pageStyle,
          filterMode: 'all',
          includeTitle: true,
        });

        const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
        expect(buffer.length).toBeGreaterThan(5000);

        const zip = await JSZip.loadAsync(buffer);

        // Check slide master or slide XML files for watermark
        const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
        expect(slideFiles.length).toBeGreaterThanOrEqual(16); // 16 Q&A pairs + title slide

        // Check for watermark across slides / slideMaster
        const masterFile = zip.file('ppt/slideMasters/slideMaster1.xml');
        let watermarkFound = false;
        if (masterFile) {
          const masterXml = await masterFile.async('string');
          if (masterXml.includes(WATERMARK_TEXT)) watermarkFound = true;
        }

        // Also check individual slide files
        let allSlidesXml = '';
        for (const slidePath of slideFiles) {
          const slideXml = await zip.file(slidePath)!.async('string');
          allSlidesXml += slideXml;
          if (slideXml.includes(WATERMARK_TEXT)) watermarkFound = true;
        }
        expect(watermarkFound).toBe(true);

        // Long answer split with (cont.)
        expect(allSlidesXml).toContain('(cont.');

        // Table shapes exist in PPTX XML (<a:tbl)
        expect(allSlidesXml).toContain('<a:tbl');
        expect(allSlidesXml).toContain('Ingestion Gateway');

        // No raw $$ text
        expect(allSlidesXml).not.toContain('$$');
        expect(allSlidesXml).not.toContain('\\frac');

        // No style names printed as visible text ("DARK" or "LIGHT")
        expect(allSlidesXml).not.toMatch(/Style:\s*(DARK|LIGHT)/i);
        expect(allSlidesXml).not.toMatch(/<a:t[^>]*>(DARK|LIGHT)<\/a:t>/);
      });
    });
  }
});
