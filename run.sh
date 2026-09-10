#!/usr/bin/env bash
# Runner WSL para o toolchain do WillTreino (node_modules vive em /home/willy/.cache).
set -euo pipefail
export NVM_DIR="$HOME/.nvm"
export JAVA_HOME="$HOME/.local/jre21"
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$JAVA_HOME/bin:$PATH"
# /mnt/c é um filesystem Windows montado no WSL e não emite eventos de inotify.
# Use `npm run dev:watch` apenas para edição com polling; `npm run dev` executa
# o build local estável, que preserva a hidratação dos formulários neste volume.
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true

cd /mnt/c/willydev/appACADEMIA
exec "$@"
