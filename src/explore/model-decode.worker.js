import decompress from 'brotli/decompress.js';
self.onmessage=({data})=>{try{const decoded=decompress(new Uint8Array(data.buffer),data.bytes);if(!decoded||decoded.length!==data.bytes)throw Error('모델 압축 해제 크기 불일치');self.postMessage({buffer:decoded.buffer},[decoded.buffer]);}catch(e){self.postMessage({error:e.message});}};
