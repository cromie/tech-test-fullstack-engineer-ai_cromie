import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown escapes raw HTML and sanitizes link URLs; we never enable rehype-raw.
// Images are dropped: a URL in model output would load with no click and could leak data (prompt injection via titles).
const components: Components = {
  p: (props) => <p className="mb-2 last:mb-0" {...props} />,
  ul: (props) => <ul className="mb-2 list-disc pl-5" {...props} />,
  ol: (props) => <ol className="mb-2 list-decimal pl-5" {...props} />,
  table: (props) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-surface-2 text-xs text-ink-2" {...props} />,
  th: (props) => <th className="border-b border-line px-3 py-2 text-left font-medium" {...props} />,
  td: (props) => <td className="border-b border-line/60 px-3 py-2 tabular-nums" {...props} />,
  strong: (props) => <strong className="font-semibold text-ink" {...props} />,
  a: (props) => <a className="text-accent underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
};

export function Markdown({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={["img"]} components={components}>{children}</ReactMarkdown>;
}
