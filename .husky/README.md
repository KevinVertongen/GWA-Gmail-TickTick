# Husky configuration

To make sure the correct Node version is used when working in IntelliJ add `~/.config/husky/init.sh` to your home directory.
This will add NVS to the clean, non-interactive shell where Husky’s init runs and execute the `nvs use` command if a .nvmrc file is found.

```bash
> sudo nano ~/.config/husky/init.sh  

export NVS_HOME="$HOME/.nvs"
[ -s "$NVS_HOME/nvs.sh" ] && . "$NVS_HOME/nvs.sh"

if test -f ".nvmrc"; then
    nvs use
fi
```