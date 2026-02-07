import pdfParse from 'pdf-parse';

console.log('pdfParse type:', typeof pdfParse);
const parser = (pdfParse as any).default || pdfParse;
console.log('parser type:', typeof parser);

try {
  if (typeof parser === 'function') {
      console.log('Parser is a function, ALL GOOD.');
  } else {
      console.error('Parser is NOT a function!');
  }
} catch (e) {
  console.error(e);
}
