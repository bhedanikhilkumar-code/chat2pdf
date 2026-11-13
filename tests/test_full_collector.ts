import { chromium } from 'playwright';
import path from 'path';

async function testFullCollection() {
  console.log('Launching browser to test full-chat collection...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const fileUrl = 'file:///' + path.resolve('tests/mock_chat.html').replace(/\\/g, '/');
  await page.goto(fileUrl);
  await page.waitForLoadState('domcontentloaded');

  const initialDomCount = await page.locator('.message-turn').count();
  console.log('Initial visible message turns in mock DOM:', initialDomCount);

  // Evaluate raw string function in browser without tsx __name injection
  const result: any = await page.evaluate(`
    (async () => {
      const container = document.getElementById('scroll-container');
      const messageMap = new Map();
      const orderedIds = [];

      function recordCurrent() {
        const turns = document.querySelectorAll('.message-turn');
        turns.forEach(function(t) {
          const id = t.getAttribute('data-message-id');
          const role = t.getAttribute('data-message-author-role');
          const content = t.querySelector('.markdown') ? t.querySelector('.markdown').textContent : '';
          if (id && !messageMap.has(id)) {
            messageMap.set(id, { id: id, role: role, content: content });
            orderedIds.push(id);
          }
        });
      }

      // Step upwards
      var rounds = 0;
      while (rounds < 120 && container.scrollTop > 0) {
        container.scrollTop = Math.max(0, container.scrollTop - 250);
        await new Promise(function(r) { setTimeout(r, 10); });
        recordCurrent();
        rounds++;
      }

      // Step downwards
      rounds = 0;
      while (rounds < 120 && container.scrollTop < container.scrollHeight) {
        container.scrollTop = Math.min(container.scrollHeight, container.scrollTop + 250);
        await new Promise(function(r) { setTimeout(r, 10); });
        recordCurrent();
        rounds++;
      }


      return {
        totalCollected: orderedIds.length,
        sampleFirst: messageMap.get(orderedIds[0]),
        sampleLast: messageMap.get(orderedIds[orderedIds.length - 1]),
      };
    })()
  `);

  console.log('Collection test result:', result);
  await browser.close();

  if (result.totalCollected !== 300) {
    throw new Error('Expected 300 messages, but collected ' + result.totalCollected);
  }
  console.log('✓ Successfully collected all 300 virtualized messages with no duplicates!');
}

testFullCollection().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
