# ERC-404

## Changelog

### v2.0-beta

- ERC-721 type token ids are now banked and reused in a FIFO queue instead of increasing forever as they are minted and burned. This allows for a predictable set of NFT token ids, as in a typical NFT collection.
- Transfers of full ERC-20 type tokens now transfer ERC-721 type tokens held by the sender to the recipient. In other words, if you transfer 3 full tokens as an ERC-20 transfer, 3 of the ERC-721s in your wallet will transfer directly to the recipient rather than those ERC-721s being burned and new token ids minted to the recipient.
- Predictable events emitted during transfers, approvals, and other operations that clearly indicate whether attributed to ERC-20 / ERC-721.
- Dedicated functions for returning ERC-20 / ERC-721 balances and total supply.
- Removal of fixed supply cap in core contract, allowing a fixed token supply cap to be added optionally if desired.
- Simplification and centralization of transfer logic.
- Easier to use dedicated minting function.
- EIP-2612 support for permit approvals.
- EIP-165 support.
- Numerous logical optimizations and gas savings.

## Introduction

ERC-404 is an experimental, mixed ERC-20 / ERC-721 implementation with native liquidity and fractionalization. While these two standards are not designed to be mixed, this implementation strives to do so in as robust a manner as possible while minimizing tradeoffs.

In its current implementation, ERC-404 effectively isolates ERC-20 / ERC-721 standard logic or introduces pathing where possible.

Pathing could best be described as a lossy encoding scheme in which token amount data and ids occupy shared space under the assumption that negligible token transfers occupying id space do not or do not need to occur.

Integrating protocols should ideally confirm these paths by checking that submitted parameters are below the token id range or above.

This iteration of ERC-404 specifically aims to address common use-cases and define better interfaces for standardization, that reduce or remove conflicts with existing ERC-20 / ERC-721 consensus.

This standard is entirely experimental and unaudited, while testing has been conducted in an effort to ensure execution is as accurate as possible.

The nature of overlapping standards, however, does imply that integrating protocols will not fully understand their mixed function.

## License

This software is released under the MIT License.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
