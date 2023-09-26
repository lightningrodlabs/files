import {
    ActionHash,
    ActionHashB64,
    AgentPubKey, AgentPubKeyB64, AppSignal,
    decodeHashFromBase64,
    encodeHashToBase64,
    EntryHash
} from "@holochain/client";


/** */
export function prettyFileSize(size: number): string {
    const kib = Math.ceil(size / 1024);
    const mib = Math.ceil(kib / 1024 * 10) / 10;
    if (mib >= 1) {
        return `${mib} MiB`;
    } else {
        return `${kib} KiB`;
    }
}


/** */
export async function emptyAppletHash(): Promise<EntryHash> {
    const zeroBytes = new Uint8Array(36).fill(0);
    return new Uint8Array([0x84, 0x21, 0x24, ...zeroBytes]);
}

/** */
export function getInitials(nickname: string): string {
    const names = nickname.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
        initials += names[names.length - 1].substring(0, 1).toUpperCase();
    } else {
        initials += names[0].substring(1, 2);
    }
    return initials;
}


/** */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa( binary );
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


/** */
async function sha256(message: string) {
    const utf8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((bytes) => bytes.toString(16).padStart(2, '0'))
        .join('');
    return hashHex;
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
    dataHash: string,
    numChunks: number,
    chunks: string[],
}


/** */
export async function splitFile(file: File, chunkMaxSize: number): Promise<SplitObject> {
    // /** Causes stack error on big files */
    // if (!base64regex.test(file.content)) {
    //   const invalid_hash = sha256(file.content);
    //   console.error("File '" + file.name + "' is invalid base64. hash is: " + invalid_hash);
    // }
    const content = await file.arrayBuffer();
    const contentB64 = arrayBufferToBase64(content);
    const splitObj = await splitData(contentB64, chunkMaxSize);
    console.log("splitObj: ", splitObj);
    return splitObj;
}


/** */
export async function splitData(full_data_string: string, chunkMaxSize: number): Promise<SplitObject> {
    const hash = await sha256(full_data_string);
    console.log('file hash: ' + hash);
    console.log('splitFile()', chunkMaxSize);
    const chunks = chunkSubstr(full_data_string, chunkMaxSize);
    return {
        dataHash: hash,
        numChunks: chunks.length,
        chunks: chunks,
    };
}

