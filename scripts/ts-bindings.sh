#!/bin/bash

set -e

zits --default-zome-name zFileShare -i dna/zomes/path_explorer -i dna/zomes/file_share -i dna/zomes/file_share_integrity -o webcomponents/src/bindings/file_share.ts
