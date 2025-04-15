import {DeliveryNotice, DeliveryZvm} from "@ddd-qc/delivery";
// @ts-ignore
import _sodium from 'libsodium-wrappers-sumo';
import {EntryId} from "@ddd-qc/lit-happ";
import {encodeHashToBase64, EntryHashB64} from "@holochain/client";


/** */
export function prettyFileSize(size: number): string {
    const kib = Math.ceil(size / 1024);
    const mib = Math.ceil(kib / 1024 * 10) / 10;
    if (mib >= 1) {
        return `${mib} MB`; // MiB
    } else {
        return `${kib} KB`; // KiB
    }
}


/** Make a pretty data string from a holochain timestamp */
export function prettyTimestamp(ts: number): string {
    if (ts <= 0) {
        return "N/A";
    }
    const date = new Date(ts / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
    const date_str = date.toLocaleString('en-US', {hour12: false});
    return date_str;
}

/** Make a pretty data string from a holochain timestamp */
export function dayTimestamp(ts: number): string {
    if (ts <= 0) {
        return "N/A";
    }
    const date = new Date(ts / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
    const date_str =     date.toLocaleDateString('en-US', { 'year': 'numeric', 'month': '2-digit', 'day': '2-digit' }); // "24 January 2024"
    return date_str;
}


export async function arrayBufferToBase64Async(buffer: ArrayBuffer): Promise<string> {
    const blob = new Blob([buffer]);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl  = reader.result as string;
            // Remove the data URL prefix (e.g., "data:application/octet-stream;base64,")
            const base64 = dataUrl .substring(dataUrl.indexOf(',') + 1);
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/** */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    console.log("arrayBufferToBase64()");
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]!);
    }
    const base64 = window.btoa(binary);
    //const binary_string = window.atob(base64); // Check if correct
    return base64;
}


/** */
export function base64ToArrayBuffer(base64: string): ArrayBufferLike {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

export type FileHashB64 = string;


/** */
export async function sha256(message: string): Promise<FileHashB64> {
    console.log("sha256()", message.length);
    const utf8 = new TextEncoder().encode(message);
    let res;
    // /* Sodium */
    // await _sodium.ready;
    // const sodium = _sodium;
    // console.log("sha256() sodium is ready!");
    // let hashArray: Uint8Array = await sodium.crypto_hash_sha256(utf8);
    // res = encodeHashToBase64(hashArray)
    // console.log("sha256() sodium", res);
    /* Crypto */
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    res = encodeHashToBase64(new Uint8Array(hashBuffer));
    console.log("sha256() crypto", res);
    /* */
    return res;
}



/** */
function chunkSubstr(str: string, size: number): Array<string> {
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array<string>(numChunks);
    for (let i = 0, y = 0; i < numChunks; ++i, y += size) {
        chunks[i] = str.substring(y, y + size);
    }
    return chunks;
}


/** */
export interface SplitObject {
    dataHash: FileHashB64,
    numChunks: number,
    chunks: string[],
}


/** */
export async function splitFile(file: File, chunkMaxSize: number): Promise<SplitObject> {
    console.log("splitFile()", file.name);
    // /** Causes stack error on big files */
    // if (!base64regex.test(file.content)) {
    //   const invalid_hash = sha256(file.content);
    //   console.error("File '" + file.name + "' is invalid base64. hash is: " + invalid_hash);
    // }
    const content = await file.arrayBuffer();
    const contentB64 = await arrayBufferToBase64Async(content);
    const splitObj = await splitData(contentB64, chunkMaxSize);
    console.log("splitObj: ", splitObj);
    return splitObj;
}


/** */
export async function splitData(full_data_string: string, chunkMaxSize: number): Promise<SplitObject> {
    console.log("splitData()", full_data_string.length, chunkMaxSize);
    const hash = await sha256(full_data_string);
    console.log("splitData() hash", hash);
    const chunks = chunkSubstr(full_data_string, chunkMaxSize);
    return {
        dataHash: hash,
        numChunks: chunks.length,
        chunks: chunks,
    };
}



export function getCompletionPct(deliveryZvm: DeliveryZvm, notice: DeliveryNotice, missingChunks: Set<EntryHashB64>): number {
    //console.log("<inbound-stack> getCompletionPct()", missingChunks.size);
    const eh = new EntryId(notice.summary.parcel_reference.parcel_eh);
    const manifest = deliveryZvm.perspective.privateManifests.get(eh);
    if (!manifest) {
        return 0;
    }
    const pct = Math.ceil((manifest[0].chunks.length - missingChunks.size) / manifest[0].chunks.length * 100);
    console.log(`getCompletionPct() ${missingChunks.size}/${manifest[0].chunks.length} = ${pct}%`);
    return pct;
}


export function decodeComponentUtf32(input: Uint8Array): string {
    const array = input.subarray(2);
    if (array.length % 4 !== 0) {
        throw new Error("Invalid UTF-32 data: Length of Uint8Array should be a multiple of 4.");
    }

    const codePoints = [];
    for (let i = 0; i < array.length; i += 4) {
        // Read 4 bytes and convert to a single 32-bit code point
        const codePoint = (
          (array[i + 3]! << 24) |
          (array[i + 2]! << 16) |
          (array[i + 1]! << 8) |
          array[i]!
        ) >>> 0; // >>> 0 ensures unsigned conversion
        codePoints.push(codePoint);
    }

    // Convert array of code points to string
    return String.fromCodePoint(...codePoints);
}
