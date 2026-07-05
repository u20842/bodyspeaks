const { ImageResponse } = require('@vercel/og');
const conditions = require('../lib/conditions.json');

const COLORS = { P: '#00c8b4', A: '#c9a84c', S: '#e07060', T: '#8b7ec8' };
const PATTERN_NAMES = { P: 'The Pairing', A: 'The Audition', S: 'The Squeeze', T: 'The Tank' };
const PATTERN_ORDER = ['P', 'A', 'S', 'T'];

const WIDTH = 1000;
const PADDING = 40;
const GROUP_HEADER_HEIGHT = 60;
const GROUP_GAP = 24;
const BOX_PADDING = 20;
const BOX_GAP = 12;
const NAME_LINE_HEIGHT = 26;
const MSG_LINE_HEIGHT = 22;
const MSG_FONT_SIZE = 15;
const CHARS_PER_LINE = 78;

function e(type, props, children) {
  const p = Object.assign({}, props || {});
  if (children !== undefined) p.children = children;
  return { type, props: p };
}

function estimateMsgLines(msg) {
  return Math.max(1, Math.ceil(msg.length / CHARS_PER_LINE));
}

function estimateBoxHeight(msg) {
  const lines = estimateMsgLines(msg);
  return BOX_PADDING * 2 + NAME_LINE_HEIGHT + (lines * MSG_LINE_HEIGHT) + 8;
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'https://bodyspeaks.icu-1111.com');
  const idsParam = url.searchParams.get('ids') || '';
  const ids = idsParam.split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean);

  const selected = conditions.filter(c => ids.includes(c.id));
  const byPattern = { P: [], A: [], S: [], T: [] };
  selected.forEach(c => { if (byPattern[c.past]) byPattern[c.past].push(c); });

  const activeGroups = PATTERN_ORDER.filter(k => byPattern[k].length > 0);

  let totalHeight = PADDING * 2;
  activeGroups.forEach((k, gi) => {
    totalHeight += GROUP_HEADER_HEIGHT;
    byPattern[k].forEach(c => {
      totalHeight += estimateBoxHeight(c.msg) + BOX_GAP;
    });
    if (gi < activeGroups.length - 1) totalHeight += GROUP_GAP;
  });
  if (activeGroups.length === 0) totalHeight = 200;

  const groupNodes = activeGroups.length === 0
    ? [e('div', { style: { display: 'flex', color: '#f0ebe0', fontSize: 20 } }, 'No conditions selected.')]
    : activeGroups.map((k, gi) => {
        const headerNode = e('div', {
          style: {
            display: 'flex', alignItems: 'center', marginBottom: 16, paddingBottom: 12,
            borderBottom: '1px solid rgba(240,235,224,0.14)',
          }
        }, [
          e('div', {
            style: {
              display: 'flex', width: 40, height: 40, borderRadius: 20,
              border: `2px solid ${COLORS[k]}`, color: COLORS[k], fontSize: 20, fontWeight: 600,
              alignItems: 'center', justifyContent: 'center', marginRight: 16,
            }
          }, k),
          e('div', { style: { display: 'flex', color: '#f0ebe0', fontSize: 22, fontWeight: 600 } }, PATTERN_NAMES[k]),
          e('div', { style: { display: 'flex', marginLeft: 'auto', color: 'rgba(240,235,224,0.5)', fontSize: 16 } }, String(byPattern[k].length)),
        ]);

        const boxNodes = byPattern[k].map((c, ci) => e('div', {
          style: {
            display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(240,235,224,0.06)',
            borderLeft: `3px solid ${COLORS[k]}`, padding: BOX_PADDING,
            marginBottom: ci < byPattern[k].length - 1 ? BOX_GAP : 0,
          }
        }, [
          e('div', { style: { display: 'flex', color: '#f0ebe0', fontSize: 17, fontWeight: 500, marginBottom: 6 } }, c.name),
          e('div', { style: { display: 'flex', color: 'rgba(240,235,224,0.72)', fontSize: MSG_FONT_SIZE, lineHeight: 1.5 } }, c.msg),
        ]));

        return e('div', {
          style: { display: 'flex', flexDirection: 'column', marginBottom: gi < activeGroups.length - 1 ? GROUP_GAP : 0 }
        }, [headerNode].concat(boxNodes));
      });

  const tree = e('div', {
    style: {
      width: WIDTH, height: totalHeight, display: 'flex', flexDirection: 'column',
      backgroundColor: '#0a1628', padding: PADDING, fontFamily: 'Montserrat, sans-serif',
    }
  }, groupNodes);

  const imageResponse = new ImageResponse(tree, { width: WIDTH, height: totalHeight });
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  res.setHeader('Content-Type', 'image/png');
  res.status(200).send(buffer);
};
