import { MODAL_STYLES_WITH_TITLEBAR } from '@/constants';
import {
  Modal,
  Text,
  Stack,
  Group,
  Badge,
  Accordion,
  Code,
  TextInput,
  Button,
  Box,
} from '@mantine/core';
import { useState } from 'react';

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
  '--sdphotomaker',
  '--sdvae',
  '--sdlora',
  '--sdflashattention',
  '--sdconvdirect',
] as const) as ReadonlySet<string>;

const IGNORED_ARGS = new Set([
  '--cli',
  '--version',
  '--launch',
  '--config',
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
    flag: '--launch',
    description: 'Launches a web browser when load is completed.',
    type: 'boolean',
    category: 'Basic',
  },
  {
    flag: '--config',
    description:
      'Load settings from a .kcpps file. Other arguments will be ignored',
    metavar: '[filename]',
    type: 'string',
    category: 'Basic',
  },
  {
    flag: '--version',
    description: 'Prints version and exits.',
    type: 'boolean',
    category: 'Advanced',
  },
  {
    flag: '--analyze',
    description:
      'Reads the metadata, weight types and tensor names in any GGUF file.',
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
    aliases: ['--batch-size', '-b'],
    description:
      'Sets the batch size used in BLAS processing (default 512). Setting it to -1 disables BLAS mode, but keeps other benefits like GPU offload.',
    type: 'int',
    choices: [
      '-1',
      '16',
      '32',
      '64',
      '128',
      '256',
      '512',
      '1024',
      '2048',
      '4096',
    ],
    default: 512,
    category: 'Advanced',
  },
  {
    flag: '--blasthreads',
    aliases: ['--threads-batch'],
    description:
      'Use a different number of threads during BLAS if specified. Otherwise, has the same value as --threads',
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
      'If set, uses customized RoPE scaling from configured frequency scale and frequency base (e.g. --ropeconfig 0.25 10000). Otherwise, uses NTK-Aware scaling set automatically based on context size.',
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
    flag: '--debugmode',
    description: 'Shows additional debug info in the terminal.',
    type: 'int',
    default: 0,
    category: 'Advanced',
  },
  {
    flag: '--onready',
    description:
      'An optional shell command to execute after the model has been loaded.',
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
      'Does not launch the HTTP server. Instead, enables input from the command line, accepting interactive console input and displaying responses to the terminal.',
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
    description:
      'Select a multimodal projector file for vision models like LLaVA.',
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
    default: 16,
    category: 'Speculative Decoding',
  },
  {
    flag: '--draftgpulayers',
    aliases: ['--gpu-layers-draft', '--n-gpu-layers-draft', '-ngld'],
    description:
      'How many layers to offload to GPU for the draft model (default=full offload)',
    metavar: '[layers]',
    type: 'int',
    default: 999,
    category: 'Speculative Decoding',
  },
  {
    flag: '--quantkv',
    description:
      'Sets the KV cache data type quantization, 0=f16, 1=q8, 2=q4. Requires Flash Attention for full effect, otherwise only K cache is quantized.',
    metavar: '[quantization level 0/1/2]',
    type: 'int',
    choices: ['0', '1', '2'],
    default: 0,
    category: 'Performance',
  },
  {
    flag: '--defaultgenamt',
    description:
      'How many tokens to generate by default, if not specified. Must be smaller than context size. Usually, your frontend GUI will override this.',
    type: 'int',
    default: 768,
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
    description:
      'If specified, loads the model quantized to save memory. 0=off, 1=q8, 2=q4',
    metavar: '[quantization level 0/1/2]',
    type: 'int',
    choices: ['0', '1', '2'],
    default: 0,
    category: 'Image Generation',
  },
  {
    flag: '--whispermodel',
    description:
      'Specify a Whisper .bin model to enable Speech-To-Text transcription.',
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
    flag: '--embeddingsmodel',
    description:
      'Specify an embeddings model to be loaded for generating embedding vectors.',
    metavar: '[filename]',
    default: '',
    category: 'Embeddings',
  },
  {
    flag: '--embeddingsgpu',
    description:
      'Attempts to offload layers of the embeddings model to GPU. Usually not needed.',
    type: 'boolean',
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
          (arg.aliases &&
            arg.aliases.some((alias) =>
              alias.toLowerCase().includes(searchQuery.toLowerCase())
            ))
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
      title="Available Command Line Arguments"
      size="xl"
      centered
      styles={MODAL_STYLES_WITH_TITLEBAR}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          These are additional command line arguments that can be added to the
          &quot;Additional Arguments&quot; field.
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
                          <Code
                            style={{ fontSize: '0.875em', fontWeight: 600 }}
                          >
                            {arg.flag}
                          </Code>
                          {arg.aliases &&
                            arg.aliases.map((alias) => (
                              <Code
                                key={alias}
                                style={{ fontSize: '0.75em' }}
                                c="dimmed"
                              >
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
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() => handleAddArgument(arg)}
                          >
                            Add
                          </Button>
                        )}
                      </Group>

                      <Text size="sm" c="dimmed">
                        {arg.description}
                      </Text>

                      {(arg.metavar ||
                        arg.default !== undefined ||
                        arg.choices) && (
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

        <Box
          style={{
            backgroundColor: 'var(--mantine-color-body)',
            padding: '0.5rem 1.5rem 0',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          <Button onClick={onClose} variant="filled">
            Close
          </Button>
        </Box>
      </Stack>
    </Modal>
  );
};
