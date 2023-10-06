# File-share applet

[We-applet](https://github.com/lightningrodlabs/we) for sharing files between agents of a We group.
Provides the `File` attachable type.

##  Design Goal

Enable sharing of files between agents by using the [Delivery zome module](https://github.com/ddd-mtl/delivery-zome).

### Features

- Store a file privately on source-chain
- Share a file publicly (On DHT).
- Download a file shared publicly
- Send a file privately to another agent
- Accept or decline a file sent from another agent (and store it on source-chain)

#### Affordances

- See status of pending distributions (outbounds). Trigger send data.
- See status of pending deliveries (inbounds). Trigger a request data.
- See source-chain size.
- See publicly available files.
- See the files stored on my source-chain.
- See the files I publicly shared.
- See incomplete sharing of public files. Re-upload file.
- Scan for incomplete/pending parcels

##### Activity timeline
- General Activity timeline
- See "activity" history with another agent.
- See "activity" history for a File.
- See "activity" history for a distribution.

##### Notifications

###### Real-time only
- New file $FILE_NAME shared publicly by $PROFILE
- Delivery reception complete
- Distribution to a recipient complete
- Upload complete (public sharing)

###### Any time
- New Delivery notice received
- Reply received


## TODO

- Check if file is already published (check dataHash; add it to public parcel linkTag)

## Dev testing

### Setup
1. Install the required tools
  1. Rust wasm target: `npm run install:rust`
  1. [`holochain`](https://github.com/holochain/holochain): `cargo install holochain` (or use nix-shell)
  4. `npm run install:hc`
  3. `npm run install:zits`
4. `npm install`
5. `npm run install:submodules`
5. `npm run install:hash-zome`
5. `npm run build:localize`

### Web
`npm run devtest`

## Network

To bootstrap a local network of 3 agents:

``` bash
npm run network:local3
```


## Package

To package the web-happ:

``` bash
npm run package:webapp
```

All output files (`*.webhapp`, `*.dna`, `*.happ`, etc.) will be in the `artifacts` folder.


## Project structure

| Directory                                  | Description                                                                                                                 |
|:-------------------------------------------| :-------------------------------------------------------------------------------------------------------------------------- |
| `/artifacts/`                              | Output folder
| `/dna/`                                    | DNA source code
| &nbsp;&nbsp;&nbsp;&nbsp;`workdir/`         | Release DNA work directory
| &nbsp;&nbsp;&nbsp;&nbsp;`workdir_dev/`     | Dev DNA work directory (includes profiles zome)
| `/scripts/`                                | Tool chain
| `/we-applet/`                              | The we-applet source code
| &nbsp;&nbsp;&nbsp;&nbsp;`webhapp.workdir/` | we-applet work directory
| `/webapp/`                                 | The webapp source code
| &nbsp;&nbsp;&nbsp;&nbsp;`webhapp.workdir/` | webhapp work directory
| `/webcomponents/`                          | The web components source code

## License
[![License: CAL 1.0](https://img.shields.io/badge/License-CAL%201.0-blue.svg)](https://github.com/holochain/cryptographic-autonomy-license)

  Copyright (C) 2023, Harris-Braun Enterprises, LLC

This program is free software: you can redistribute it and/or modify it under the terms of the license
provided in the LICENSE file (CAL-1.0).  This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
