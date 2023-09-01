import { DnaViewModel, ZvmDef } from "@ddd-qc/lit-happ";
import {DeliveryZvm, SignalProtocol, SignalProtocolType} from "@ddd-qc/delivery";
import {AppSignalCb, encodeHashToBase64} from "@holochain/client";
import {AppSignal} from "@holochain/client/lib/api/app/types";
import {FileShareZvm} from "./fileShare.zvm";


/**
 * TODO: Make a "passthrough" DVM generator in dna-client based on ZVM_DEFS
 */
export class FileShareDvm extends DnaViewModel {

    /** -- DnaViewModel Interface -- */

    static readonly DEFAULT_BASE_ROLE_NAME = "rFileShare";
    static readonly ZVM_DEFS: ZvmDef[] = [
        FileShareZvm,
        [DeliveryZvm, "zDelivery"],
    ];

    readonly signalHandler?: AppSignalCb = () => {};


    /** QoL Helpers */
    get fileShareZvm(): FileShareZvm {return this.getZomeViewModel(FileShareZvm.DEFAULT_ZOME_NAME) as FileShareZvm}
    get deliveryZvm(): DeliveryZvm {return this.getZomeViewModel("zDelivery") as DeliveryZvm}


    /** -- ViewModel Interface -- */

    protected hasChanged(): boolean {return true}

    get perspective(): void {return}

}
