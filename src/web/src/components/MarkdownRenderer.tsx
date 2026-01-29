import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({
  content,
}: MarkdownRendererProps): React.ReactElement {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-xl font-bold mt-5 mb-3" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />
          ),
          h4: ({ ...props }) => (
            <h4 className="text-base font-semibold mt-3 mb-2" {...props} />
          ),
          p: ({ ...props }) => <p className="mb-3" {...props} />,
          ul: ({ ...props }) => (
            <ul className="list-disc list-inside mb-3 space-y-1" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol
              className="list-decimal list-inside mb-3 space-y-1"
              {...props}
            />
          ),
          li: ({ ...props }) => <li className="ml-4" {...props} />,
          code: ({ className, ...props }) => {
            const isInline = !className;
            return isInline ? (
              <code
                className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono"
                {...props}
              />
            ) : (
              <code
                className="block bg-gray-100 p-3 rounded my-2 text-sm font-mono overflow-x-auto"
                {...props}
              />
            );
          },
          pre: ({ ...props }) => <pre className="my-2" {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-gray-300 pl-4 italic my-3"
              {...props}
            />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-3">
              <table
                className="min-w-full border-collapse border border-gray-300"
                {...props}
              />
            </div>
          ),
          th: ({ ...props }) => (
            <th
              className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold text-left"
              {...props}
            />
          ),
          td: ({ ...props }) => (
            <td className="border border-gray-300 px-3 py-2" {...props} />
          ),
          a: ({ ...props }) => (
            <a className="text-blue-600 hover:underline" {...props} />
          ),
          strong: ({ ...props }) => <strong className="font-bold" {...props} />,
          em: ({ ...props }) => <em className="italic" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
