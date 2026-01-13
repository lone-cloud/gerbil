import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathExists } from '@/utils/node/fs';
import { tryExecute } from '@/utils/node/logging';
import { getAssetPath } from '@/utils/node/path';

const KLITE_CSS_OVERRIDE = `
<style id="gerbil-css-override">
* {
  transition: 100ms ease all;
}

.maincontainer {
  padding-right: 0 !important;
  padding-left: 0 !important;
}

.adaptivecontainer {
  width: 100% !important;
}

#lastreq1 {
  margin: 0 10px;
}

#navbarNavDropdown {
  padding: 0;
}

#actionmenuitems {
  margin-left: 10px;
}

#inputrow {
  padding: 0 10px;
}
#inputrow > :nth-child(1) {
  padding-right: 0 !important;
}
#inputrow.show_mode > :nth-child(1) {
  flex: 0 0 70px;
  margin-right: 4px;
}
#inputrow > :nth-child(3) {
  flex: 0 0 70px;
  padding-right: 0 !important;
}
#inputrow.show_mode > :nth-child(3) button {
  background-color: #129c00;
  font-size: 14px;
}
#inputrow.show_mode > :nth-child(3) button:hover {
  background-color: #058105;
}
</style>`;

export const patchKliteEmbd = (unpackedDir: string) =>
  tryExecute(async () => {
    const possiblePaths = [
      join(unpackedDir, '_internal', 'embd_res', 'klite.embd'),
      join(unpackedDir, 'embd_res', 'klite.embd'),
    ];

    let kliteEmbdPath: string | null = null;
    for (const path of possiblePaths) {
      if (await pathExists(path)) {
        kliteEmbdPath = path;
        break;
      }
    }

    if (!kliteEmbdPath) {
      return;
    }

    const content = await readFile(kliteEmbdPath, 'utf8');

    if (content.includes('</head>')) {
      let patchedContent = content;

      if (content.includes('gerbil-css-override')) {
        patchedContent = patchedContent.replace(
          /<style id="gerbil-css-override">[\s\S]*?<\/style>\s*/g,
          ''
        );
      }

      patchedContent = patchedContent.replace('</head>', `${KLITE_CSS_OVERRIDE}\n</head>`);

      await writeFile(kliteEmbdPath, patchedContent, 'utf8');
    }
  }, 'Failed to patch klite.embd');

export const patchKcppSduiEmbd = (unpackedDir: string) =>
  tryExecute(async () => {
    const possiblePaths = [
      join(unpackedDir, '_internal', 'embd_res', 'kcpp_sdui.embd'),
      join(unpackedDir, 'kcpp_sdui.embd'),
    ];

    const sourceAssetPath = getAssetPath('kcpp_sdui.embd');

    for (const targetPath of possiblePaths) {
      if (await pathExists(targetPath)) {
        await copyFile(sourceAssetPath, targetPath);
        break;
      }
    }
  }, 'Failed to patch kcpp_sdui.embd');

export const patchLcppGzEmbd = (unpackedDir: string) =>
  tryExecute(async () => {
    const possiblePaths = [
      join(unpackedDir, '_internal', 'embd_res', 'lcpp.gz.embd'),
      join(unpackedDir, 'lcpp.gz.embd'),
    ];

    const sourceAssetPath = getAssetPath('lcpp.gz.embd');

    for (const targetPath of possiblePaths) {
      if (await pathExists(targetPath)) {
        await copyFile(sourceAssetPath, targetPath);
        break;
      }
    }
  }, 'Failed to patch lcpp.gz.embd');

export function filterSpam(output: string) {
  const spamPatterns = [
    /^print_info:/,
    /^llama_model_load_from_file_impl:/,
    /^llama_model_loader:/,
    /^init_tokenizer:/,
    /^load:/,
    /^load_tensors:/,
    /^llama_context:/,
    /^llama_kv_cache/,
    /^set_abort_callback:/,
    /^attach_threadpool:/,
    /^ggml_/,
    /^Namespace\(/,
    /^==========$/,
    /^Loading Chat Completions Adapter:/,
    /^Chat Completions Adapter Loaded$/,
    /^Chat completion heuristic:/,
    /^Embedded .* loaded\.$/,
  ];

  return output
    .split('\n')
    .filter((line) => !spamPatterns.some((pattern) => pattern.test(line)))
    .map((line) => line.replace(/^Welcome to KoboldCpp - Version/, 'Version'))
    .join('\n');
}
