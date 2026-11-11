/** Resolve the tree's PUBLIC content independently from the private recipient's card.
 * Nothing private may reach the public tree unless the visitor actively opts in.
 */
export type PublicTreeChoice = {
  gift: boolean;
  reusePersonalText: boolean;
  personalMessage: string;
  personalSignature: string;
  treeMessage: string;
  treeSignature: string;
  publishOnTree: boolean;
};

export function resolvePublicTreeChoice(choice: PublicTreeChoice) {
  const { gift, reusePersonalText, personalMessage, personalSignature, treeMessage, treeSignature, publishOnTree } = choice;
  if (!publishOnTree) return { dedica: '', firma: '', consent: false };
  return {
    dedica: (gift && reusePersonalText ? personalMessage : treeMessage).trim(),
    firma: (gift && reusePersonalText ? personalSignature : treeSignature).trim(),
    consent: true,
  };
}
