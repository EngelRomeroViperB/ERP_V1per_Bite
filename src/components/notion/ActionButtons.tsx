"use client";

import { useState } from "react";
import { ACTION_BUTTONS } from "@/lib/notion-databases";
import { NotionFormModal } from "./NotionFormModal";

export function ActionButtons() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {ACTION_BUTTONS.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setActiveModal(btn.key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border hover:bg-accent hover:border-primary/30 transition-all text-sm font-medium"
          >
            <span>{btn.icon}</span>
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {ACTION_BUTTONS.map((btn) => (
        <NotionFormModal
          key={btn.key}
          isOpen={activeModal === btn.key}
          onClose={() => setActiveModal(null)}
          title={btn.label}
          icon={btn.icon}
          databaseId={btn.databaseId}
          fields={btn.fields}
        />
      ))}
    </>
  );
}
