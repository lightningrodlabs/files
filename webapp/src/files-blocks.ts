import {TemplateResult, html} from "lit";
import {FileTableItem} from "@files/elements/dist/elements/file-table";
import {FileShareDvm} from "@files/elements";

/** */
export enum FilesBlockType {
    ImportFile = "ImportFile",
    PickFile = "PickFile",
}

export function buildBlock(blockViewInfo: any, filesDvm: FileShareDvm): TemplateResult<1> {
    const deliveryPerspective = filesDvm.deliveryZvm.perspective;
    switch (blockViewInfo.block) {
        case FilesBlockType.ImportFile:
            return html`
                <store-dialog></store-dialog>
            `;
            break;
        case FilesBlockType.PickFile:
            const privateItems = Object.entries(deliveryPerspective.privateManifests)
                .map(([ppEh, [pm, timestamp]]) => {
                    return {
                        ppEh,
                        description: pm.description,
                        timestamp,
                        author: this.cell.agentPubKey,
                        isLocal: true,
                        isPrivate: true
                    } as FileTableItem;
                });
            const publicItems = Object.entries(deliveryPerspective.publicParcels)
                .map(([ppEh, [description, timestamp, author]]) => {
                    const isLocal = !!this.deliveryPerspective.localPublicManifests[ppEh];
                    return {ppEh, description, timestamp, author, isLocal, isPrivate: false} as FileTableItem;
                });
            const allItems = privateItems.concat(publicItems);

            return html`
                <h2>Select File</h2>
                <file-table 
                        .items=${allItems}
                        @selected${(e) => {console.log("Block PickFile: File selected", e)}}
                ></file-table>
            `;
            break;
        default:
            throw new Error(`Unknown Block request "${blockViewInfo.block}"`);
    }
}
