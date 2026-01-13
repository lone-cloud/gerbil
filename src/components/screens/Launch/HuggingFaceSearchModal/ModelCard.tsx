import { Accordion, Group, Loader, Paper, Text } from '@mantine/core';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { HUGGINGFACE_BASE_URL } from '@/constants';

interface ModelCardProps {
  modelId: string;
}

export const ModelCard = ({ modelId }: ModelCardProps) => {
  const [readme, setReadme] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReadme = async () => {
    if (readme !== null) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${HUGGINGFACE_BASE_URL}/${modelId}/raw/main/README.md`);
      if (!response.ok) {
        throw new Error('README not available');
      }
      let text = await response.text();

      const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
      text = text.replace(frontmatterRegex, '');

      setReadme(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load README');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Accordion>
      <Accordion.Item value="readme">
        <Accordion.Control onClick={() => void loadReadme()}>Model Card</Accordion.Control>
        <Accordion.Panel>
          {loading && (
            <Group justify="center" py="md">
              <Loader size="sm" />
            </Group>
          )}
          {error && (
            <Text c="dimmed" size="sm">
              {error}
            </Text>
          )}
          {readme && (
            <Paper
              p="md"
              withBorder
              style={{
                overflow: 'auto',
                maxWidth: '100%',
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                  img: ({ node, ...props }) => (
                    <img
                      {...props}
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        display: 'block',
                      }}
                    />
                  ),
                  pre: ({ node, ...props }) => (
                    <pre
                      {...props}
                      style={{
                        overflow: 'auto',
                        maxWidth: '100%',
                      }}
                    />
                  ),
                  code: ({ node, ...props }) => (
                    <code
                      {...props}
                      style={{
                        wordBreak: 'break-word',
                      }}
                    />
                  ),
                }}
              >
                {readme}
              </ReactMarkdown>
            </Paper>
          )}
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};
