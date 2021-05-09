# Telegram chat export optimizer

Since for whatever reason telegram decideds to export a sticker multiple times when only one copy is needed, this is used to cleanup telegram exports.

This is just for my self but if you want to improve it, you are welcome to send a PR.

## Caveat

This script only works on POSIX compliant systems (aka. everything except windows) because it uses symlink.

## Usage

Since this is mainly for my self and used only occasionally, all config is just hard coded into the script and path to the stickers are read from `argv[1]`.

```sh
node index.js <Path to stickers>
```
