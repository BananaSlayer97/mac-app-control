export type ContextMenuItem =
  | { type: "divider" }
  | { type: "header"; label: string }
  | {
      type: "item";
      label: string;
      onClick: () => void;
      danger?: boolean;
      disabled?: boolean;
      shortcut?: string;
      checked?: boolean;
    };

