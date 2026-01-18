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
  '--noavx2',
  '--failsafe',
  '--usemmap',
  '--moeexperts',
  '--moecpu',
  '--usecuda',
  '--usevulkan',
  '--useclblast',
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
  '--smartcache',
  '--pipelineparallel',
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
] as const) as ReadonlySet<string>;

const COMMAND_LINE_ARGUMENTS = [
  {
    flag: '--threads',
    aliases: ['-t'],
    description:
      'Use a custom number of threads if specified. Otherwise, uses an amount based on CPU cores',
    metavar: '[threads]',
    type: 'int',
    category: 'Basic',
  },
  {
    flag: '--analyze',
    description: 'Reads the metadata, weight types and tensor names in any GGUF file.',
    metavar: '[filename]',
    default: '',
    category: 'Advanced',
  },
  {
    flag: '--maingpu',
    aliases: ['--main-gpu', '-mg'],
    description:
      'Only used in a multi-gpu setup. Sets the index of the main GPU that will be used.',
    metavar: '[Device ID]',
    type: 'int',
    default: -1,
    category: 'Advanced',
  },
  {
    flag: '--blasbatchsize',
    aliases: ['--batchsize', '--batch-size', '-b'],
    description:
      'Sets the batch size used in batched processing (default 512). Setting it to -1 disables batched mode, but keeps other benefits like GPU offload.',
    type: 'int',
    choices: ['-1', '16', '32', '64', '128', '256', '512', '1024', '2048', '4096'],
    default: 512,
    category: 'Advanced',
  },
  {
    flag: '--blasthreads',
    aliases: ['--batchthreads', '--threadsbatch', '--threads-batch'],
    description:
      'Use a different number of threads during batching if specified. Otherwise, has the same value as --threads',
    metavar: '[threads]',
    type: 'int',
    default: 0,
    category: 'Advanced',
  },
  {
    flag: '--lora',
    description: 'GGUF models only, applies a lora file on top of model.',
    metavar: '[lora_filename]',
    type: 'string[]',
    category: 'Advanced',
  },
  {
    flag: '--loramult',
    description: 'Multiplier for the Text LORA model to be applied.',
    metavar: '[amount]',
    type: 'float',
    default: 1.0,
    category: 'Advanced',
  },
  {
    flag: '--nofastforward',
    description:
      'If set, do not attempt to fast forward GGUF context (always reprocess). Will also enable noshift',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--useswa',
    description:
      'If set, allows Sliding Window Attention (SWA) KV Cache, which saves memory but cannot be used with context shifting.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--ropeconfig',
    description:
      'If set, uses customized RoPE scaling from configured frequency scale and frequency base (e.g. --ropeconfig 0.25 10000). Otherwise, uses NTK-Aware scaling set automatically based on context size. For linear rope, simply set the freq-scale and ignore the freq-base',
    metavar: '[rope-freq-scale] [rope-freq-base]',
    default: '0.0 10000.0',
    type: 'float[]',
    category: 'Advanced',
  },
  {
    flag: '--overridenativecontext',
    description:
      'Overrides the native trained context of the loaded model with a custom value to be used for Rope scaling.',
    metavar: '[trained context]',
    type: 'int',
    default: 0,
    category: 'Advanced',
  },
  {
    flag: '--usemlock',
    aliases: ['--mlock'],
    description:
      'Enables mlock, preventing the RAM used to load the model from being paged out. Not usually recommended.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--onready',
    description: 'An optional shell command to execute after the model has been loaded.',
    metavar: '[shell command]',
    type: 'string',
    default: '',
    category: 'Advanced',
  },
  {
    flag: '--benchmark',
    description:
      'Do not start server, instead run benchmarks. If filename is provided, appends results to provided file.',
    metavar: '[filename]',
    type: 'string',
    default: 'stdout',
    category: 'Advanced',
  },
  {
    flag: '--prompt',
    aliases: ['-p'],
    description:
      'Passing a prompt string triggers a direct inference, loading the model, outputs the response to stdout and exits. Can be used alone or with benchmark.',
    metavar: '[prompt]',
    type: 'string',
    default: '',
    category: 'Advanced',
  },
  {
    flag: '--cli',
    description:
      'Does not launch KoboldCpp HTTP server. Instead, enables KoboldCpp from the command line, accepting interactive console input and displaying responses to the terminal.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--genlimit',
    aliases: ['--promptlimit'],
    description:
      'Sets the maximum number of generated tokens, it will restrict all generations to this or lower. Also usable with --prompt or --benchmark.',
    metavar: '[token limit]',
    type: 'int',
    default: 0,
    category: 'Advanced',
  },
  {
    flag: '--highpriority',
    description:
      'Experimental flag. If set, increases the process CPU priority, potentially speeding up generation. Use caution.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--foreground',
    description:
      'Windows only. Sends the terminal to the foreground every time a new prompt is generated. This helps avoid some idle slowdown issues.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--preloadstory',
    description:
      'Configures a prepared story json save file to be hosted on the server, which frontends (such as KoboldAI Lite) can access over the API.',
    metavar: '[savefile]',
    default: '',
    category: 'Advanced',
  },
  {
    flag: '--savedatafile',
    description:
      'If enabled, creates or opens a persistent database file on the server, that allows users to save and load their data remotely. A new file is created if it does not exist.',
    metavar: '[savefile]',
    default: '',
    category: 'Advanced',
  },
  {
    flag: '--quiet',
    description:
      'Enable quiet mode, which hides generation inputs and outputs in the terminal. Quiet mode is automatically enabled when running a horde worker.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--ssl',
    description:
      'Allows all content to be served over SSL instead. A valid UNENCRYPTED SSL cert and key .pem files must be provided',
    metavar: '[cert_pem] [key_pem]',
    type: 'string[]',
    category: 'Advanced',
  },
  {
    flag: '--password',
    description:
      'Enter a password required to use this instance. This key will be required for all text endpoints. Image endpoints are not secured.',
    metavar: '[API key]',
    default: 'None',
    category: 'Advanced',
  },
  {
    flag: '--mmproj',
    description: 'Select a multimodal projector file for vision models like LLaVA.',
    metavar: '[filename]',
    default: '',
    category: 'Multimodal',
  },
  {
    flag: '--mmprojcpu',
    aliases: ['--no-mmproj-offload'],
    description: 'Force CLIP for Vision mmproj always on CPU.',
    type: 'boolean',
    category: 'Multimodal',
  },
  {
    flag: '--visionmaxres',
    description:
      'Clamp MMProj vision maximum allowed resolution. Allowed values are between 512 to 2048 px (default 1024).',
    metavar: '[max px]',
    type: 'int',
    default: 1024,
    category: 'Multimodal',
  },
  {
    flag: '--draftmodel',
    aliases: ['--model-draft', '-md'],
    description:
      'Load a small draft model for speculative decoding. It will be fully offloaded. Vocab must match the main model.',
    metavar: '[filename]',
    default: '',
    category: 'Speculative Decoding',
  },
  {
    flag: '--draftamount',
    aliases: ['--draft-max', '--draft-n'],
    description: 'How many tokens to draft per chunk before verifying results',
    metavar: '[tokens]',
    type: 'int',
    default: 8,
    category: 'Speculative Decoding',
  },
  {
    flag: '--draftgpulayers',
    aliases: ['--gpu-layers-draft', '--n-gpu-layers-draft', '-ngld'],
    description: 'How many layers to offload to GPU for the draft model (default=full offload)',
    metavar: '[layers]',
    type: 'int',
    default: 999,
    category: 'Speculative Decoding',
  },
  {
    flag: '--draftgpusplit',
    description:
      'GPU layer distribution ratio for draft model (default=same as main). Only works if multi-GPUs selected for MAIN model and tensor_split is set!',
    metavar: '[Ratios]',
    type: 'float[]',
    category: 'Speculative Decoding',
  },
  {
    flag: '--defaultgenamt',
    description:
      'How many tokens to generate by default, if not specified. Must be smaller than context size. Usually, your frontend GUI will override this.',
    type: 'int',
    default: 896,
    category: 'Performance',
  },
  {
    flag: '--nobostoken',
    description:
      'Prevents BOS token from being added at the start of any prompt. Usually NOT recommended for most models.',
    type: 'boolean',
    category: 'Performance',
  },
  {
    flag: '--enableguidance',
    description:
      'Enables the use of Classifier-Free-Guidance, which allows the use of negative prompts. Has performance and memory impact.',
    type: 'boolean',
    category: 'Performance',
  },
  {
    flag: '--ratelimit',
    description:
      'If enabled, rate limit generative request by IP address. Each IP can only send a new request once per X seconds.',
    metavar: '[seconds]',
    type: 'int',
    default: 0,
    category: 'Advanced',
  },
  {
    flag: '--ignoremissing',
    description: 'Ignores all missing non-essential files, just skipping them instead.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--chatcompletionsadapter',
    description:
      'Select an optional ChatCompletions Adapter JSON file to force custom instruct tags.',
    metavar: '[filename]',
    default: 'AutoGuess',
    category: 'Advanced',
  },
  {
    flag: '--jinja',
    description:
      'Enables using jinja chat template formatting for chat completions endpoint. Other endpoints are unaffected. Tool calls are done without jinja.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--jinja_tools',
    aliases: ['--jinja-tools', '--jinjatools'],
    description:
      'Enables using jinja chat template formatting for chat completions endpoint. Other endpoints are unaffected. Tool calls are done with jinja.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--smartcontext',
    description:
      'Reserving a portion of context to try processing less frequently. Outdated. Not recommended.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--unpack',
    description: 'Extracts the file contents of the KoboldCpp binary into a target directory.',
    metavar: 'destination',
    type: 'string',
    default: '',
    category: 'Advanced',
  },
  {
    flag: '--exportconfig',
    description: 'Exports the current selected arguments as a .kcpps settings file',
    metavar: '[filename]',
    type: 'string',
    default: '',
    category: 'Advanced',
  },
  {
    flag: '--exporttemplate',
    description: 'Exports the current selected arguments as a .kcppt template file',
    metavar: '[filename]',
    type: 'string',
    default: '',
    category: 'Advanced',
  },
  {
    flag: '--nomodel',
    description: 'Allows you to launch the GUI alone, without selecting any model.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--singleinstance',
    description:
      'Allows this KoboldCpp instance to be shut down by any new instance requesting the same port, preventing duplicate servers from clashing on a port.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--gendefaults',
    description: 'Sets extra default parameters for some fields in API requests, as a JSON string.',
    metavar: '{"parameter":"value",...}',
    default: '',
    category: 'Advanced',
  },
  {
    flag: '--gendefaultsoverwrite',
    description:
      'Allow the gendefaults parameters to overwrite the original value in API payloads.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--maxrequestsize',
    description:
      'Specify a max request payload size. Any requests to the server larger than this size will be dropped. Do not change if unsure.',
    metavar: '[size in MB]',
    type: 'int',
    default: 32,
    category: 'Advanced',
  },
  {
    flag: '--overridekv',
    aliases: ['--override-kv'],
    description:
      'Override metadata value by key. Separate multiple values with commas. Format is name=type:value. Types: int, float, bool, str',
    metavar: '[name=type:value]',
    default: '',
    category: 'Advanced',
  },
  {
    flag: '--overridetensors',
    aliases: ['--override-tensor', '-ot'],
    description:
      'Override selected backend for specific tensors matching tensor_name_regex_pattern=buffer_type, same as in llama.cpp.',
    metavar: '[tensor name pattern=buffer type]',
    default: '',
    category: 'Advanced',
  },
  {
    flag: '--admin',
    description:
      'Enables admin mode, allowing you to unload and reload different configurations or models.',
    type: 'boolean',
    category: 'Administration',
  },
  {
    flag: '--adminpassword',
    description:
      'Require a password to access admin functions. You are strongly advised to use one for publically accessible instances!',
    metavar: '[password]',
    default: 'None',
    category: 'Administration',
  },
  {
    flag: '--admindir',
    description:
      'Specify a directory to look for .kcpps configs in, which can be used to swap models.',
    metavar: '[directory]',
    default: '',
    category: 'Administration',
  },
  {
    flag: '--hordemodelname',
    description: 'Sets your AI Horde display model name.',
    metavar: '[name]',
    default: '',
    category: 'Horde Worker',
  },
  {
    flag: '--hordeworkername',
    description: 'Sets your AI Horde worker name.',
    metavar: '[name]',
    default: '',
    category: 'Horde Worker',
  },
  {
    flag: '--hordekey',
    description: 'Sets your AI Horde API key.',
    metavar: '[apikey]',
    default: '',
    category: 'Horde Worker',
  },
  {
    flag: '--hordemaxctx',
    description:
      'Sets the maximum context length your worker will accept from an AI Horde job. If 0, matches main context limit.',
    metavar: '[amount]',
    type: 'int',
    default: 0,
    category: 'Horde Worker',
  },
  {
    flag: '--hordegenlen',
    description:
      'Sets the maximum number of tokens your worker will generate from an AI horde job.',
    metavar: '[amount]',
    type: 'int',
    default: 0,
    category: 'Horde Worker',
  },
  {
    flag: '--sdthreads',
    description:
      'Use a different number of threads for image generation if specified. Otherwise, has the same value as --threads.',
    metavar: '[threads]',
    type: 'int',
    default: 0,
    category: 'Image Generation',
  },
  {
    flag: '--sdquant',
    description: 'If specified, loads the model quantized to save memory. 0=off, 1=q8, 2=q4',
    metavar: '[quantization level 0/1/2]',
    type: 'int',
    choices: ['0', '1', '2'],
    default: 0,
    category: 'Image Generation',
  },
  {
    flag: '--sdclamped',
    description:
      'If specified, limit generation steps and image size for shared use. Accepts an extra optional parameter that indicates maximum resolution (eg. 768 clamps to 768x768, min 512px, disabled if 0).',
    metavar: '[maxres]',
    type: 'int',
    default: 0,
    category: 'Image Generation',
  },
  {
    flag: '--sdclampedsoft',
    description:
      'If specified, limit max image size to curb memory usage. Similar to --sdclamped, but less strict, allows trade-offs between width and height (e.g. 640 would allow 640x640, 512x768 and 768x512 images). Total resolution cannot exceed 1MP.',
    metavar: '[maxres]',
    type: 'int',
    default: 0,
    category: 'Image Generation',
  },
  {
    flag: '--sdvaeauto',
    description: 'Uses a built-in VAE via TAE SD, which is very fast, and fixed bad VAEs.',
    type: 'boolean',
    category: 'Image Generation',
  },
  {
    flag: '--sdloramult',
    description: 'Multiplier for the image LORA model to be applied.',
    metavar: '[amount]',
    type: 'float',
    default: 1.0,
    category: 'Image Generation',
  },
  {
    flag: '--sdtiledvae',
    description:
      'Adjust the automatic VAE tiling trigger for images above this size. 0 disables vae tiling.',
    metavar: '[maxres]',
    type: 'int',
    default: 768,
    category: 'Image Generation',
  },
  {
    flag: '--sdoffloadcpu',
    description: 'Offload image weights in RAM to save VRAM, swap into VRAM when needed.',
    type: 'boolean',
    category: 'Image Generation',
  },
  {
    flag: '--whispermodel',
    description: 'Specify a Whisper .bin model to enable Speech-To-Text transcription.',
    metavar: '[filename]',
    default: '',
    category: 'Audio',
  },
  {
    flag: '--ttsmodel',
    description: 'Specify the TTS Text-To-Speech GGUF model.',
    metavar: '[filename]',
    default: '',
    category: 'Audio',
  },
  {
    flag: '--ttsgpu',
    description: 'Use the GPU for TTS.',
    type: 'boolean',
    category: 'Audio',
  },
  {
    flag: '--ttswavtokenizer',
    description: 'Specify the WavTokenizer GGUF model.',
    metavar: '[filename]',
    default: '',
    category: 'Audio',
  },
  {
    flag: '--ttsmaxlen',
    description: 'Limit number of audio tokens generated with TTS.',
    type: 'int',
    default: 4096,
    category: 'Audio',
  },
  {
    flag: '--ttsthreads',
    description:
      'Use a different number of threads for TTS if specified. Otherwise, has the same value as --threads.',
    metavar: '[threads]',
    type: 'int',
    default: 0,
    category: 'Audio',
  },
  {
    flag: '--embeddingsmodel',
    description: 'Specify an embeddings model to be loaded for generating embedding vectors.',
    metavar: '[filename]',
    default: '',
    category: 'Embeddings',
  },
  {
    flag: '--embeddingsgpu',
    description: 'Attempts to offload layers of the embeddings model to GPU. Usually not needed.',
    type: 'boolean',
    category: 'Embeddings',
  },
  {
    flag: '--embeddingsmaxctx',
    description:
      'Overrides the default maximum supported context of an embeddings model (defaults to trained context).',
    metavar: '[amount]',
    type: 'int',
    default: 0,
    category: 'Embeddings',
  },
] as const;

const AVAILABLE_ARGUMENTS = COMMAND_LINE_ARGUMENTS.filter(
  (arg) => !UI_COVERED_ARGS.has(arg.flag) && !IGNORED_ARGS.has(arg.flag)
);

export const CommandLineArgumentsModal = ({
  opened,
  onClose,
  onAddArgument,
}: CommandLineArgumentsModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const argumentsByCategory = AVAILABLE_ARGUMENTS.reduce(
    (acc, arg) => {
      if (!acc[arg.category]) {
        acc[arg.category] = [];
      }
      acc[arg.category].push(arg);
      return acc;
    },
    {} as Record<string, ArgumentInfo[]>
  );

  const filteredCategories = Object.entries(argumentsByCategory).reduce(
    (acc, [category, args]) => {
      const filteredArgs = args.filter(
        (arg) =>
          arg.flag.toLowerCase().includes(searchQuery.toLowerCase()) ||
          arg.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          arg.aliases?.some((alias) => alias.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      if (filteredArgs.length > 0) {
        acc[category] = filteredArgs;
      }

      return acc;
    },
    {} as Record<string, ArgumentInfo[]>
  );

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
                        borderLeft: '3px solid var(--mantine-color-blue-4)',
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
                            <Badge size="xs" variant="light" color="blue">
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

                      {(arg.metavar || arg.default !== undefined || arg.choices) && (
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
