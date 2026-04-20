import { Accordion, Badge, Button, Code, Group, Stack, Text, TextInput } from '@mantine/core';
import { Code as CodeIcon } from 'lucide-react';
import { useState } from 'react';

import { Modal } from '@/components/Modal';

interface CommandLineArgumentsModalProps {
  opened: boolean;
  onClose: () => void;
  onAddArgument?: (argument: string) => void;
}

interface ArgumentInfo {
  flag: string;
  aliases?: readonly string[];
  description: string;
  metavar?: string;
  default?: string | number;
  type?: string;
  choices?: readonly string[];
  category: string;
}

const UI_COVERED_ARGS = new Set([
  '--model',
  '--sdmodel',
  '--gpulayers',
  '--contextsize',
  '--port',
  '--host',
  '--multiuser',
  '--multiplayer',
  '--remotetunnel',
  '--nocertify',
  '--websearch',
  '--noshift',
  '--flashattention',
  '--noflashattention',
  '--noavx2',
  '--failsafe',
  '--usemmap',
  '--moeexperts',
  '--moecpu',
  '--usecuda',
  '--usevulkan',
  '--tensorsplit',
  '--sdt5xxl',
  '--sdclipl',
  '--sdclipg',
  '--sdclip1',
  '--sdclip2',
  '--sdphotomaker',
  '--sdvae',
  '--sdlora',
  '--sdconvdirect',
  '--sdvaecpu',
  '--sdclipgpu',
  '--sdflashattention',
  '--tensor_split',
  '--debugmode',
  '--lowvram',
  '--jinja',
  '--jinja_tools',
  '--jinja_kwargs',
  '--smartcache',
  '--pipelineparallel',
  '--nopipelineparallel',
  '--quantkv',
  '--usecpu',
  '--autofit',
] as const) as ReadonlySet<string>;

const IGNORED_ARGS = new Set([
  '--cli',
  '--version',
  '--launch',
  '--config',
  '--showgui',
  '--skiplauncher',
  '--unpack',
  '--exportconfig',
  '--exporttemplate',
  '--nomodel',
  '--singleinstance',
  '--hordeconfig',
  '--sdconfig',
  '--noblas',
  '--nommap',
  '--no-mmap',
  '--sdnotile',
  '--testmemory',
  '--forceversion',
  '--sdgendefaults',
  '--pipelineparallel',
  '--flashattention',
  '--flash-attn',
  '-fa',
] as const) as ReadonlySet<string>;

const COMMAND_LINE_ARGUMENTS = [
  {
    aliases: ['-t'],
    category: 'Basic',
    description:
      'Use a custom number of threads if specified. Otherwise, uses an amount based on CPU cores',
    flag: '--threads',
    metavar: '[threads]',
    type: 'int',
  },
  {
    category: 'Advanced',
    default: '',
    description: 'Reads the metadata, weight types and tensor names in any GGUF file.',
    flag: '--analyze',
    metavar: '[filename]',
  },
  {
    aliases: ['--main-gpu', '-mg'],
    category: 'Advanced',
    default: -1,
    description:
      'Only used in a multi-gpu setup. Sets the index of the main GPU that will be used.',
    flag: '--maingpu',
    metavar: '[Device ID]',
    type: 'int',
  },
  {
    aliases: ['--blasbatchsize', '--batch-size', '-b'],
    category: 'Advanced',
    choices: ['-1', '16', '32', '64', '128', '256', '512', '1024', '2048', '4096'],
    default: 512,
    description:
      'Sets the batch size used in batched processing (default 512). Setting it to -1 disables batched mode, but keeps other benefits like GPU offload.',
    flag: '--batchsize',
    type: 'int',
  },
  {
    aliases: ['--batchthreads', '--threadsbatch', '--threads-batch'],
    category: 'Advanced',
    default: 0,
    description:
      'Use a different number of threads during batching if specified. Otherwise, has the same value as --threads',
    flag: '--blasthreads',
    metavar: '[threads]',
    type: 'int',
  },
  {
    category: 'Advanced',
    description: 'GGUF models only, applies a lora file on top of model.',
    flag: '--lora',
    metavar: '[lora_filename]',
    type: 'string[]',
  },
  {
    category: 'Advanced',
    default: 1,
    description: 'Multiplier for the Text LORA model to be applied.',
    flag: '--loramult',
    metavar: '[amount]',
    type: 'float',
  },
  {
    category: 'Advanced',
    description:
      'If set, do not attempt to fast forward GGUF context (always reprocess). Will also enable noshift',
    flag: '--nofastforward',
    type: 'boolean',
  },
  {
    category: 'Advanced',
    description:
      'If set, allows Sliding Window Attention (SWA) KV Cache, which saves memory but cannot be used with context shifting.',
    flag: '--useswa',
    type: 'boolean',
  },
  {
    category: 'Advanced',
    default: 512,
    description:
      'How much extra to pad the SWA KV cache, extending the SWA context window by the specified number of tokens. Only active when --useswa is enabled.',
    flag: '--swapadding',
    metavar: '[tokens]',
    type: 'int',
  },
  {
    category: 'Advanced',
    default: '0.0 10000.0',
    description:
      'If set, uses customized RoPE scaling from configured frequency scale and frequency base (e.g. --ropeconfig 0.25 10000). Otherwise, uses NTK-Aware scaling set automatically based on context size. For linear rope, simply set the freq-scale and ignore the freq-base',
    flag: '--ropeconfig',
    metavar: '[rope-freq-scale] [rope-freq-base]',
    type: 'float[]',
  },
  {
    category: 'Advanced',
    default: 0,
    description:
      'Overrides the native trained context of the loaded model with a custom value to be used for Rope scaling.',
    flag: '--overridenativecontext',
    metavar: '[trained context]',
    type: 'int',
  },
  {
    aliases: ['--mlock'],
    category: 'Advanced',
    description:
      'Enables mlock, preventing the RAM used to load the model from being paged out. Not usually recommended.',
    flag: '--usemlock',
    type: 'boolean',
  },
  {
    category: 'Advanced',
    default: '',
    description: 'An optional shell command to execute after the model has been loaded.',
    flag: '--onready',
    metavar: '[shell command]',
    type: 'string',
  },
  {
    category: 'Advanced',
    default: 'stdout',
    description:
      'Do not start server, instead run benchmarks. If filename is provided, appends results to provided file.',
    flag: '--benchmark',
    metavar: '[filename]',
    type: 'string',
  },
  {
    aliases: ['-p'],
    category: 'Advanced',
    default: '',
    description:
      'Passing a prompt string triggers a direct inference, loading the model, outputs the response to stdout and exits. Can be used alone or with benchmark.',
    flag: '--prompt',
    metavar: '[prompt]',
    type: 'string',
  },
  {
    category: 'Advanced',
    description:
      'Does not launch KoboldCpp HTTP server. Instead, enables KoboldCpp from the command line, accepting interactive console input and displaying responses to the terminal.',
    flag: '--cli',
    type: 'boolean',
  },
  {
    aliases: ['--promptlimit'],
    category: 'Advanced',
    default: 0,
    description:
      'Sets the maximum number of generated tokens, it will restrict all generations to this or lower. Also usable with --prompt or --benchmark.',
    flag: '--genlimit',
    metavar: '[token limit]',
    type: 'int',
  },
  {
    category: 'Advanced',
    description:
      'Experimental flag. If set, increases the process CPU priority, potentially speeding up generation. Use caution.',
    flag: '--highpriority',
    type: 'boolean',
  },
  {
    category: 'Advanced',
    description:
      'Windows only. Sends the terminal to the foreground every time a new prompt is generated. This helps avoid some idle slowdown issues.',
    flag: '--foreground',
    type: 'boolean',
  },
  {
    category: 'Advanced',
    default: '',
    description:
      'Configures a prepared story json save file to be hosted on the server, which frontends (such as KoboldAI Lite) can access over the API.',
    flag: '--preloadstory',
    metavar: '[savefile]',
  },
  {
    category: 'Advanced',
    default: '',
    description:
      'If enabled, creates or opens a persistent database file on the server, that allows users to save and load their data remotely. A new file is created if it does not exist.',
    flag: '--savedatafile',
    metavar: '[savefile]',
  },
  {
    category: 'Advanced',
    description:
      'Enable quiet mode, which hides generation inputs and outputs in the terminal. Quiet mode is automatically enabled when running a horde worker.',
    flag: '--quiet',
    type: 'boolean',
  },
  {
    category: 'Advanced',
    description:
      'Allows all content to be served over SSL instead. A valid UNENCRYPTED SSL cert and key .pem files must be provided',
    flag: '--ssl',
    metavar: '[cert_pem] [key_pem]',
    type: 'string[]',
  },
  {
    category: 'Advanced',
    default: 'None',
    description:
      'Enter a password required to use this instance. This key will be required for all text endpoints. Image endpoints are not secured. Can also be set with env var KOBOLDCPP_PASSWORD.',
    flag: '--password',
    metavar: '[API key]',
  },
  {
    category: 'Multimodal',
    default: '',
    description: 'Select a multimodal projector file for vision models like LLaVA.',
    flag: '--mmproj',
    metavar: '[filename]',
  },
  {
    aliases: ['--no-mmproj-offload'],
    category: 'Multimodal',
    description: 'Force CLIP for Vision mmproj always on CPU.',
    flag: '--mmprojcpu',
    type: 'boolean',
  },
  {
    category: 'Multimodal',
    default: 1024,
    description:
      'Clamp MMProj vision maximum allowed resolution. Allowed values are between 512 to 2048 px (default 1024).',
    flag: '--visionmaxres',
    metavar: '[max px]',
    type: 'int',
  },
  {
    aliases: ['--image-min-tokens'],
    category: 'Multimodal',
    default: -1,
    description:
      'Override the minimum tokens for the MMProj vision embedding (default -1, use model default).',
    flag: '--visionmintokens',
    metavar: '[tokens]',
    type: 'int',
  },
  {
    aliases: ['--image-max-tokens'],
    category: 'Multimodal',
    default: -1,
    description:
      'Override the maximum tokens for the MMProj vision embedding (default -1, use model default).',
    flag: '--visionmaxtokens',
    metavar: '[tokens]',
    type: 'int',
  },
  {
    aliases: ['--model-draft', '-md'],
    category: 'Speculative Decoding',
    default: '',
    description:
      'Load a small draft model for speculative decoding. It will be fully offloaded. Vocab must match the main model.',
    flag: '--draftmodel',
    metavar: '[filename]',
  },
  {
    aliases: ['--draft-max', '--draft-n'],
    category: 'Speculative Decoding',
    default: 8,
    description: 'How many tokens to draft per chunk before verifying results',
    flag: '--draftamount',
    metavar: '[tokens]',
    type: 'int',
  },
  {
    aliases: ['--gpu-layers-draft', '--n-gpu-layers-draft', '-ngld'],
    category: 'Speculative Decoding',
    default: 999,
    description: 'How many layers to offload to GPU for the draft model (default=full offload)',
    flag: '--draftgpulayers',
    metavar: '[layers]',
    type: 'int',
  },
  {
    category: 'Speculative Decoding',
    description:
      'GPU layer distribution ratio for draft model (default=same as main). Only works if multi-GPUs selected for MAIN model and tensor_split is set!',
    flag: '--draftgpusplit',
    metavar: '[Ratios]',
    type: 'float[]',
  },
  {
    category: 'Performance',
    default: 896,
    description:
      'How many tokens to generate by default, if not specified. Must be smaller than context size. Usually, your frontend GUI will override this.',
    flag: '--defaultgenamt',
    type: 'int',
  },
  {
    category: 'Performance',
    description:
      'Prevents BOS token from being added at the start of any prompt. Usually NOT recommended for most models.',
    flag: '--nobostoken',
    type: 'boolean',
  },
  {
    category: 'Performance',
    description:
      'Enables the use of Classifier-Free-Guidance, which allows the use of negative prompts. Has performance and memory impact.',
    flag: '--enableguidance',
    type: 'boolean',
  },
  {
    category: 'Advanced',
    default: 0,
    description:
      'If enabled, rate limit generative request by IP address. Each IP can only send a new request once per X seconds.',
    flag: '--ratelimit',
    metavar: '[seconds]',
    type: 'int',
  },
  {
    category: 'Advanced',
    description: 'Ignores all missing non-essential files, just skipping them instead.',
    flag: '--ignoremissing',
    type: 'boolean',
  },
  {
    category: 'Advanced',
    default: 'AutoGuess',
    description:
      'Select an optional ChatCompletions Adapter JSON file to force custom instruct tags.',
    flag: '--chatcompletionsadapter',
    metavar: '[filename]',
  },
  {
    category: 'Advanced',
    description:
      'Reserving a portion of context to try processing less frequently. Outdated. Not recommended.',
    flag: '--smartcontext',
    type: 'boolean',
  },
  {
    category: 'Advanced',
    default: '',
    description: 'Extracts the file contents of the KoboldCpp binary into a target directory.',
    flag: '--unpack',
    metavar: 'destination',
    type: 'string',
  },
  {
    category: 'Advanced',
    default: '',
    description: 'Exports the current selected arguments as a .kcpps settings file',
    flag: '--exportconfig',
    metavar: '[filename]',
    type: 'string',
  },
  {
    category: 'Advanced',
    default: '',
    description: 'Exports the current selected arguments as a .kcppt template file',
    flag: '--exporttemplate',
    metavar: '[filename]',
    type: 'string',
  },
  {
    category: 'Advanced',
    description: 'Allows you to launch the GUI alone, without selecting any model.',
    flag: '--nomodel',
    type: 'boolean',
  },
  {
    category: 'Advanced',
    description:
      'Allows this KoboldCpp instance to be shut down by any new instance requesting the same port, preventing duplicate servers from clashing on a port.',
    flag: '--singleinstance',
    type: 'boolean',
  },
  {
    category: 'Advanced',
    default: '',
    description: 'Sets extra default parameters for some fields in API requests, as a JSON string.',
    flag: '--gendefaults',
    metavar: '{"parameter":"value",...}',
  },
  {
    category: 'Advanced',
    description:
      'Allow the gendefaults parameters to overwrite the original value in API payloads.',
    flag: '--gendefaultsoverwrite',
    type: 'boolean',
  },
  {
    category: 'Advanced',
    default: 32,
    description:
      'Specify a max request payload size. Any requests to the server larger than this size will be dropped. Do not change if unsure.',
    flag: '--maxrequestsize',
    metavar: '[size in MB]',
    type: 'int',
  },
  {
    aliases: ['--override-kv'],
    category: 'Advanced',
    default: '',
    description:
      'Override metadata value by key. Separate multiple values with commas. Format is name=type:value. Types: int, float, bool, str',
    flag: '--overridekv',
    metavar: '[name=type:value]',
  },
  {
    aliases: ['--override-tensor', '-ot'],
    category: 'Advanced',
    default: '',
    description:
      'Override selected backend for specific tensors matching tensor_name_regex_pattern=buffer_type, same as in llama.cpp.',
    flag: '--overridetensors',
    metavar: '[tensor name pattern=buffer type]',
  },
  {
    category: 'Administration',
    description:
      'Enables admin mode, allowing you to unload and reload different configurations or models.',
    flag: '--admin',
    type: 'boolean',
  },
  {
    category: 'Administration',
    default: 'None',
    description:
      'Require a password to access admin functions. You are strongly advised to use one for publically accessible instances! Can also be set with env var KOBOLDCPP_ADMINPASSWORD.',
    flag: '--adminpassword',
    metavar: '[password]',
  },
  {
    category: 'Administration',
    default: '',
    description:
      'Specify a directory to look for .kcpps configs in, which can be used to swap models.',
    flag: '--admindir',
    metavar: '[directory]',
  },
  {
    category: 'Administration',
    default: 0,
    description:
      'Set an idle timeout in seconds after which KoboldCpp will automatically unload the current model.',
    flag: '--adminunloadtimeout',
    type: 'int',
  },
  {
    category: 'Administration',
    description:
      'Router mode uses a reverse proxy router, allowing you to easily hotswap models and configs within a single request. Requires admin mode.',
    flag: '--routermode',
    type: 'boolean',
  },
  {
    category: 'Administration',
    description:
      'Autoswap mode builds on router mode to allow switching of model types within the same config automatically. Requires admin mode and router mode. All models desired must be defined within the same config.',
    flag: '--autoswapmode',
    type: 'boolean',
  },
  {
    category: 'Administration',
    default: '',
    description:
      'Specify a base .kcpps config to apply if no custom base config is selected during a model swap. The config will be merged with the config being loaded.',
    flag: '--baseconfig',
    metavar: '[filename]',
  },
  {
    category: 'Horde Worker',
    default: '',
    description: 'Sets your AI Horde display model name.',
    flag: '--hordemodelname',
    metavar: '[name]',
  },
  {
    category: 'Horde Worker',
    default: '',
    description: 'Sets your AI Horde worker name.',
    flag: '--hordeworkername',
    metavar: '[name]',
  },
  {
    category: 'Horde Worker',
    default: '',
    description: 'Sets your AI Horde API key.',
    flag: '--hordekey',
    metavar: '[apikey]',
  },
  {
    category: 'Horde Worker',
    default: 0,
    description:
      'Sets the maximum context length your worker will accept from an AI Horde job. If 0, matches main context limit.',
    flag: '--hordemaxctx',
    metavar: '[amount]',
    type: 'int',
  },
  {
    category: 'Horde Worker',
    default: 0,
    description:
      'Sets the maximum number of tokens your worker will generate from an AI horde job.',
    flag: '--hordegenlen',
    metavar: '[amount]',
    type: 'int',
  },
  {
    category: 'Image Generation',
    default: 0,
    description:
      'Use a different number of threads for image generation if specified. Otherwise, has the same value as --threads.',
    flag: '--sdthreads',
    metavar: '[threads]',
    type: 'int',
  },
  {
    category: 'Image Generation',
    choices: ['0', '1', '2'],
    default: 0,
    description: 'If specified, loads the model quantized to save memory. 0=off, 1=q8, 2=q4',
    flag: '--sdquant',
    metavar: '[quantization level 0/1/2]',
    type: 'int',
  },
  {
    category: 'Image Generation',
    default: 0,
    description:
      'If specified, limit generation steps and image size for shared use. Accepts an extra optional parameter that indicates maximum resolution (eg. 768 clamps to 768x768, min 512px, disabled if 0).',
    flag: '--sdclamped',
    metavar: '[maxres]',
    type: 'int',
  },
  {
    category: 'Image Generation',
    default: 0,
    description:
      'If specified, limit max image size to curb memory usage. Similar to --sdclamped, but less strict, allows trade-offs between width and height (e.g. 640 would allow 640x640, 512x768 and 768x512 images).',
    flag: '--sdclampedsoft',
    metavar: '[maxres]',
    type: 'int',
  },
  {
    category: 'Image Generation',
    description: 'Uses a built-in tiny VAE via TAE SD, which is very fast, and fixed bad VAEs.',
    flag: '--sdvaeauto',
    type: 'boolean',
  },
  {
    category: 'Image Generation',
    default: '',
    description:
      'You can use ESRGAN as an upscaling model to resize images. Leave blank if unused.',
    flag: '--sdupscaler',
    metavar: '[filename]',
  },
  {
    category: 'Image Generation',
    default: '1.0',
    description: 'Multipliers for the image LoRA model to be applied.',
    flag: '--sdloramult',
    metavar: '[amounts]',
    type: 'float[]',
  },
  {
    category: 'Image Generation',
    default: 768,
    description:
      'Adjust the automatic VAE tiling trigger for images above this size. 0 disables vae tiling.',
    flag: '--sdtiledvae',
    metavar: '[maxres]',
    type: 'int',
  },
  {
    category: 'Image Generation',
    description: 'Offload image weights in RAM to save VRAM, swap into VRAM when needed.',
    flag: '--sdoffloadcpu',
    type: 'boolean',
  },
  {
    category: 'Image Generation',
    default: -1,
    description: 'If specified, Image Generation weights will be placed on the selected GPU index',
    flag: '--sdmaingpu',
    metavar: '[Device ID]',
    type: 'int',
  },
  {
    category: 'Audio',
    default: '',
    description: 'Specify a Whisper .bin model to enable Speech-To-Text transcription.',
    flag: '--whispermodel',
    metavar: '[filename]',
  },
  {
    category: 'Audio',
    default: '',
    description: 'Specify the TTS Text-To-Speech GGUF model.',
    flag: '--ttsmodel',
    metavar: '[filename]',
  },
  {
    category: 'Audio',
    description: 'Use the GPU for TTS.',
    flag: '--ttsgpu',
    type: 'boolean',
  },
  {
    category: 'Audio',
    default: '',
    description: 'Specify the WavTokenizer GGUF model.',
    flag: '--ttswavtokenizer',
    metavar: '[filename]',
  },
  {
    category: 'Audio',
    default: '',
    description: 'Select directory containing voices for voice cloning.',
    flag: '--ttsdir',
    metavar: '[directory]',
  },
  {
    category: 'Audio',
    default: 4096,
    description: 'Limit number of audio tokens generated with TTS.',
    flag: '--ttsmaxlen',
    type: 'int',
  },
  {
    category: 'Audio',
    default: 0,
    description:
      'Use a different number of threads for TTS if specified. Otherwise, has the same value as --threads.',
    flag: '--ttsthreads',
    metavar: '[threads]',
    type: 'int',
  },
  {
    category: 'Embeddings',
    default: '',
    description: 'Specify an embeddings model to be loaded for generating embedding vectors.',
    flag: '--embeddingsmodel',
    metavar: '[filename]',
  },
  {
    category: 'Embeddings',
    description: 'Attempts to offload layers of the embeddings model to GPU. Usually not needed.',
    flag: '--embeddingsgpu',
    type: 'boolean',
  },
  {
    category: 'Embeddings',
    default: 0,
    description:
      'Overrides the default maximum supported context of an embeddings model (defaults to trained context).',
    flag: '--embeddingsmaxctx',
    metavar: '[amount]',
    type: 'int',
  },
  {
    category: 'Music Generation',
    default: '',
    description: 'Select music LLM model (e.g acestep-5Hz-lm-0.6B)',
    flag: '--musicllm',
    metavar: '[filename]',
  },
  {
    category: 'Music Generation',
    default: '',
    description: 'Select music embedding model (e.g Qwen3-Embedding-0.6B)',
    flag: '--musicembeddings',
    metavar: '[filename]',
  },
  {
    category: 'Music Generation',
    default: '',
    description: 'Select music diffusion (DiT) model (e.g acestep-v15-turbo)',
    flag: '--musicdiffusion',
    metavar: '[filename]',
  },
  {
    category: 'Music Generation',
    default: '',
    description: 'Select music VAE model',
    flag: '--musicvae',
    metavar: '[filename]',
  },
  {
    category: 'Music Generation',
    description: 'Unload music models when not in use',
    flag: '--musiclowvram',
    type: 'boolean',
  },
  {
    category: 'Advanced',
    default: '',
    description:
      'Specify path to mcp.json which contains the Cladue Desktop compatible MCP server config.',
    flag: '--mcpfile',
    metavar: '[mcp json file]',
  },
  {
    aliases: ['--chat-template-file'],
    category: 'Advanced',
    default: '',
    description:
      "Select a custom Jinja chat template file, overwriting the model's built-in Jinja chat template.",
    flag: '--jinjatemplate',
    metavar: '[filename]',
  },
  {
    aliases: ['-dev'],
    category: 'Advanced',
    default: '',
    description:
      'Set llama.cpp compatible device selection override. Comma separated. Overrides normal device choices.',
    flag: '--device',
    metavar: '<dev1,dev2,..>',
  },
  {
    category: 'Advanced',
    default: '',
    description:
      'Specify a directory that models will be downloaded to or searched from, if unset uses the working directory.',
    flag: '--downloaddir',
    metavar: '[directory]',
  },
  {
    category: 'Advanced',
    description:
      "How much spare allowance in MB should autofit reserve? If it's too little, the load might fail.",
    flag: '--autofitpadding',
    metavar: '[padding in MB]',
    type: 'int',
  },
] as const;

const AVAILABLE_ARGUMENTS = COMMAND_LINE_ARGUMENTS.filter(
  (arg) => !UI_COVERED_ARGS.has(arg.flag) && !IGNORED_ARGS.has(arg.flag),
);

export const CommandLineArgumentsModal = ({
  opened,
  onClose,
  onAddArgument,
}: CommandLineArgumentsModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const argumentsByCategory = AVAILABLE_ARGUMENTS.reduce<Record<string, ArgumentInfo[]>>(
    (acc, arg) => {
      if (!acc[arg.category]) {
        acc[arg.category] = [];
      }
      acc[arg.category].push(arg);
      return acc;
    },
    {},
  );

  const filteredCategories = Object.entries(argumentsByCategory).reduce<
    Record<string, ArgumentInfo[]>
  >((acc, [category, args]) => {
    const filteredArgs = args.filter(
      (arg) =>
        arg.flag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        arg.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        arg.aliases?.some((alias) => alias.toLowerCase().includes(searchQuery.toLowerCase())),
    );

    if (filteredArgs.length > 0) {
      acc[category] = filteredArgs;
    }

    return acc;
  }, {});

  const handleAddArgument = (arg: ArgumentInfo) => {
    if (onAddArgument) {
      let argumentToAdd = arg.flag;

      if (arg.type !== 'boolean' && arg.metavar) {
        argumentToAdd += ' ';
      }

      onAddArgument(argumentToAdd);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <CodeIcon size={20} />
          <Text fw={500}>Available Command Line Arguments</Text>
        </Group>
      }
      size="xl"
      showCloseButton
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          These are additional command line arguments that can be added to the &quot;Additional
          Arguments&quot; input field.
        </Text>

        <TextInput
          placeholder="Search arguments..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
        />

        <Accordion variant="separated">
          {Object.entries(filteredCategories).map(([category, args]) => (
            <Accordion.Item key={category} value={category}>
              <Accordion.Control>
                <Group justify="space-between">
                  <Text fw={600}>{category}</Text>
                  <Badge size="sm" variant="light">
                    {args.length} argument{args.length !== 1 ? 's' : ''}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  {args.map((arg) => (
                    <Stack
                      key={arg.flag}
                      gap="xs"
                      p="sm"
                      style={{
                        background:
                          'light-dark(var(--mantine-color-brand-0), var(--mantine-color-dark-6))',
                        borderRadius: 'var(--mantine-radius-sm)',
                        border:
                          '1px solid light-dark(var(--mantine-color-brand-2), var(--mantine-color-dark-4))',
                      }}
                    >
                      <Group gap="xs" wrap="wrap" justify="space-between">
                        <Group gap="xs" wrap="wrap" style={{ flex: 1 }}>
                          <Code style={{ fontSize: '0.875em', fontWeight: 600 }}>{arg.flag}</Code>
                          {arg.aliases?.map((alias) => (
                            <Code key={alias} style={{ fontSize: '0.75em' }} c="dimmed">
                              {alias}
                            </Code>
                          ))}
                          {arg.type && (
                            <Badge size="xs" variant="light" color="brand">
                              {arg.type}
                            </Badge>
                          )}
                        </Group>

                        {onAddArgument && (
                          <Button size="xs" variant="light" onClick={() => handleAddArgument(arg)}>
                            Add
                          </Button>
                        )}
                      </Group>

                      <Text size="sm" c="dimmed">
                        {arg.description}
                      </Text>

                      {((arg.metavar ?? arg.default !== undefined) || arg.choices) && (
                        <Group gap="lg">
                          {arg.metavar && (
                            <Text size="xs" c="dimmed">
                              <strong>Format:</strong> {arg.metavar}
                            </Text>
                          )}
                          {arg.default !== undefined && (
                            <Text size="xs" c="dimmed">
                              <strong>Default:</strong> {String(arg.default)}
                            </Text>
                          )}
                          {arg.choices && (
                            <Text size="xs" c="dimmed">
                              <strong>Choices:</strong> {arg.choices.join(', ')}
                            </Text>
                          )}
                        </Group>
                      )}
                    </Stack>
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>
    </Modal>
  );
};
