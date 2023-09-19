//import { encodeHashToBase64 } from "@holochain/client";


onmessage = function(event) {
  console.log('Main thread said: ' + event);
  postMessage('Hello, main thread!');
};



// async function commitPrivateFile(file/*: File*/, splitObj/*: SplitObject*/, zomeProxy/*: FileShareProxy*/)/*: Promise<EntryHashB64>*/ {
//   /** Commit each chunk */
//   const chunksToSend/*: EntryHash[]*/ = [];
//   for (let i = 0; i < splitObj.numChunks; ++i) {
//     const eh = await zomeProxy.writeChunk(/*splitObj.dataHash, i,*/ splitObj.chunks[i]);
//     chunksToSend.push(eh);
//     //await delay(splitObj.numChunks)
//   }
//   /** Commit file manifest */
//   const params = {
//     filename: file.name,
//     filetype: file.type,
//     data_hash: splitObj.dataHash,
//     orig_filesize: file.size,
//     chunks: chunksToSend,
//   }
//   const [manifest_eh, description] =  await zomeProxy.commitPrivateFile(params);
//   const ehb64 = encodeHashToBase64(manifest_eh);
//   /** Store new manifest */
//   const manifest = {
//     data_hash: splitObj.dataHash,
//     chunks: chunksToSend,
//     description,
//   }/* as ParcelManifest*/;
//   /** Done */
//   return [ehb64, manifest];
// }
