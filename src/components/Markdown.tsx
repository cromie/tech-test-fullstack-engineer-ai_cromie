import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown escapes raw HTML by default and sanitizes link URLs; we never enable rehype-raw.
const components: Components = {
  p: (props) => <p className="mb-2 last:mb-0" {...props} />,
  ul: (props) => <ul className="mb-2 list-disc pl-5" {...props} />,
  ol: (props) => <ol className="mb-2 list-decimal pl-5" {...props} />,
  table: (props) => <table className="my-2 w-full border-collapse text-sm" {...props} />,
  th: (props) => <th className="border-b border-zinc-300 px-2 py-1 text-left font-medium" {...props} />,
  td: (props) => <td className="border-b border-zinc-100 px-2 py-1" {...props} />,
  a: (props) => <a className="text-blue-600 underline" target="_blank" rel="noopener noreferrer" {...props} />,
};

export function Markdown({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown>;
}
