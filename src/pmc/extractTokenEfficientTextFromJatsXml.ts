import { Jats } from "jats-xml";
import { jatsConvertTransform } from "jats-convert";
import mystToMd from "myst-to-md";
import { remove } from "unist-util-remove";
import type { Node, Parent } from "unist";
import { unified } from "unified";

type NodeWithRefType = Node & { refType?: unknown };

export function extractTokenEfficientTextFromJatsXml(
  xmlString: string,
): string {
  const jats = new Jats(xmlString);
  // Restrict conversion scope to body + back only.
  const tree: Parent = {
    type: "root",
    children: [jats.body, jats.back].filter(Boolean) as Node[],
  };

  // Remove bibliography sections before conversion.
  remove(tree, "ref-list");
  remove(tree, "ref");

  // Remove bibliographic inline citations in JATS-shaped trees.
  remove(tree, (node) => {
    if (node.type !== "xref") return false;
    const refType = (node as NodeWithRefType).refType;
    const kebabRefType = (node as unknown as Record<string, unknown>)[
      "ref-type"
    ];
    return refType === "bibr" || kebabRefType === "bibr";
  });

  // Ensure jats-convert runs on the cleaned, body/back-scoped tree.
  (jats as unknown as { tree: Node }).tree = tree;

  const converted = jatsConvertTransform(jats);
  const markdownTree = converted.tree as unknown as Node;

  // Remove citation artifacts in MyST AST to keep prompt token-efficient.
  remove(markdownTree, "citeGroup");
  remove(markdownTree, "cite");
  remove(markdownTree, "bibliography");

  // `myst-to-md` returns a VFile; markdown is in `result` (typings are loose).
  const output = unified()
    .use(mystToMd)
    .stringify(markdownTree as never);


  const markdown =
    typeof output === "object" &&
      output !== null &&
      "result" in output &&
      typeof output.result === "string"
      ? output.result
      : String(output);

  return markdown.trim();
}
