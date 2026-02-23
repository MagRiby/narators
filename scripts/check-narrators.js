const data = JSON.parse(require('fs').readFileSync('./data/narrators.json','utf-8'));
const missing = data.filter(n => n.name_ar === '').slice(0,8);
console.log('Missing Arabic:');
missing.forEach(n => console.log(' ', n.id, n.name_en));
const good = data.filter(n => n.name_ar !== '').slice(0,8);
console.log('With Arabic:');
good.forEach(n => console.log(' ', n.id, '|', n.name_en, '|', n.name_ar));
