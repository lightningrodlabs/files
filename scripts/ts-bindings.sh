#!/bin/bash

set -e

zits --default-zome-name zFileShare -d "import {DistributionStrategy, ParcelManifest, ParcelChunk, ParcelDescription, ParcelKind, ParcelReference} from '@ddd-qc/delivery';" -i dna/zomes/path_explorer -i dna/zomes/file_share -i dna/zomes/file_share_integrity -o webcomponents/src/bindings/file_share.ts

